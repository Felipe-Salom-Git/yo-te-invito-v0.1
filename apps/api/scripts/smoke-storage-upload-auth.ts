/**
 * Smoke: upload authorization for POST /uploads/public-image.
 *
 * 1. USER común → platform upload → expect 403
 *    - Production: SMOKE_NON_ADMIN_EMAIL + SMOKE_NON_ADMIN_PASSWORD
 *    - Dev fallback: ephemeral register (may fail if public signup blocked)
 * 2. Optional: SMOKE_PRODUCER_EMAIL + SMOKE_PRODUCER_OTHER_PROFILE_ID → 403 cross-owner
 * 3. Optional: SMOKE_PRODUCER_EVENT_ID → 200 own event (requires GCS on API)
 *
 * ADMIN upload smoke: smoke:storage-upload (separate script).
 * No destructive cleanup in this script.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  login,
  resolveSmokeNonAdminUser,
  smokeApiUrl,
  smokeApiBase,
} from './lib/smoke-auth';
import { runSmokeScript } from './lib/smoke-runner';

const MIN_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function loadSmokeImage(): { buffer: Buffer; filename: string; mime: string } {
  const custom = process.env.SMOKE_UPLOAD_FILE?.trim();
  if (custom) {
    const path = resolve(custom);
    if (!existsSync(path)) throw new Error(`SMOKE_UPLOAD_FILE not found: ${path}`);
    const buffer = readFileSync(path);
    return {
      buffer,
      filename: path.split(/[/\\]/).pop() ?? 'upload.bin',
      mime: 'image/png',
    };
  }
  return {
    buffer: Buffer.from(MIN_PNG_BASE64, 'base64'),
    filename: 'smoke-upload-test.png',
    mime: 'image/png',
  };
}

async function uploadWithAuth(
  headers: Record<string, string>,
  fields: Record<string, string>,
): Promise<{ status: number; data: unknown }> {
  const { buffer, filename, mime } = loadSmokeImage();
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime }), filename);
  for (const [k, v] of Object.entries(fields)) {
    form.append(k, v);
  }
  const res = await fetch(smokeApiUrl('/uploads/public-image'), {
    method: 'POST',
    headers,
    body: form,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function main() {
  console.log('smoke:storage-upload-auth —', smokeApiBase());
  console.log('  ADMIN upload: run smoke:storage-upload separately');

  const nonAdmin = await resolveSmokeNonAdminUser('upload-auth');
  if (!nonAdmin.ok) {
    for (const line of nonAdmin.lines) {
      console.error(line);
    }
    process.exit(1);
  }

  const user = nonAdmin.user;
  const userLabel =
    user.source === 'env'
      ? `SMOKE_NON_ADMIN (${user.email})`
      : `Ephemeral USER (${user.email})`;
  console.log('  Auth for 403 test:', userLabel);

  const forbiddenPlatform = await uploadWithAuth(
    { Authorization: `Bearer ${user.token}` },
    { scope: 'platform', purpose: 'banner' },
  );
  if (forbiddenPlatform.status !== 403) {
    console.error('Expected 403 for USER platform upload, got', forbiddenPlatform.status, forbiddenPlatform.data);
    process.exit(1);
  }
  console.log('  USER platform upload → 403 OK');

  const producerEmail = process.env.SMOKE_PRODUCER_EMAIL?.trim().toLowerCase();
  const producerPassword =
    process.env.SMOKE_PRODUCER_PASSWORD ?? process.env.SMOKE_USER_PASSWORD;
  const otherProfileId = process.env.SMOKE_PRODUCER_OTHER_PROFILE_ID?.trim();

  if (producerEmail && producerPassword && otherProfileId) {
    const producer = await login(producerEmail, producerPassword);
    if (!producer) {
      console.error('SMOKE_PRODUCER_EMAIL login failed');
      process.exit(1);
    }
    const crossOwner = await uploadWithAuth(
      { Authorization: `Bearer ${producer.token}` },
      { scope: 'producer', purpose: 'logo', entityId: otherProfileId },
    );
    if (crossOwner.status !== 403) {
      console.error('Expected 403 for cross-producer upload, got', crossOwner.status, crossOwner.data);
      process.exit(1);
    }
    console.log('  PRODUCER cross-profile upload → 403 OK');
  } else {
    console.log('  Skip cross-producer test (set SMOKE_PRODUCER_EMAIL + SMOKE_PRODUCER_OTHER_PROFILE_ID)');
  }

  const ownEventId = process.env.SMOKE_PRODUCER_EVENT_ID?.trim();
  if (producerEmail && producerPassword && ownEventId) {
    const producer = await login(producerEmail, producerPassword);
    if (!producer) {
      console.error('SMOKE_PRODUCER_EMAIL login failed');
      process.exit(1);
    }
    const ownEvent = await uploadWithAuth(
      { Authorization: `Bearer ${producer.token}` },
      { scope: 'event', purpose: 'cover', entityId: ownEventId },
    );
    if (ownEvent.status === 503) {
      console.warn('  Own-event upload skipped — GCS not configured (503)');
    } else if (ownEvent.status !== 200 && ownEvent.status !== 201) {
      console.error('Expected 200 for own event upload, got', ownEvent.status, ownEvent.data);
      process.exit(1);
    } else {
      console.log('  PRODUCER own event upload → OK');
    }
  } else {
    console.log('  Skip own-event upload (set SMOKE_PRODUCER_EMAIL + SMOKE_PRODUCER_EVENT_ID)');
  }

  console.log('smoke:storage-upload-auth — PASS');
}

runSmokeScript('smoke:storage-upload-auth', main);
