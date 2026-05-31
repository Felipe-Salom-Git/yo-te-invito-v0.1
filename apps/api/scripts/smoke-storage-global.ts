/**
 * Global storage upload smoke — auth matrix, validation, public URL HEAD.
 *
 * Requires API running + GCS configured (503 tests skipped with notice).
 *
 *   SMOKE_USER_EMAIL + SMOKE_USER_PASSWORD (ADMIN recommended)
 *
 * Optional vertical ownership (skip if unset):
 *   SMOKE_RENTAL_LOCATION_ID
 *   SMOKE_PRODUCER_PROFILE_ID, SMOKE_PRODUCER_OTHER_PROFILE_ID, SMOKE_PRODUCER_EVENT_ID
 *   SMOKE_GASTRO_PROFILE_ID, SMOKE_GASTRO_OTHER_PROFILE_ID
 *   SMOKE_HOTEL_PROFILE_ID, SMOKE_HOTEL_OTHER_PROFILE_ID
 *   SMOKE_PRODUCER_EMAIL + SMOKE_PRODUCER_PASSWORD (or reuse SMOKE_USER_PASSWORD)
 *
 * Usage:
 *   pnpm --filter api run smoke:storage-global
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getSmokeCredentials,
  login,
  registerSmokeUser,
  resolveSmokeAuth,
  smokeApiUrl,
  smokeApiBase,
  smokeCredentialsHelp,
} from './lib/smoke-auth';
import { runSmokeScript } from './lib/smoke-runner';

const MIN_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function loadPng(): { buffer: Buffer; filename: string; mime: string } {
  const custom = process.env.SMOKE_UPLOAD_FILE?.trim();
  if (custom) {
    const path = resolve(custom);
    if (!existsSync(path)) throw new Error(`SMOKE_UPLOAD_FILE not found: ${path}`);
    return {
      buffer: readFileSync(path),
      filename: path.split(/[/\\]/).pop() ?? 'upload.bin',
      mime: 'image/png',
    };
  }
  return {
    buffer: Buffer.from(MIN_PNG_BASE64, 'base64'),
    filename: 'smoke-global.png',
    mime: 'image/png',
  };
}

async function upload(
  headers: Record<string, string>,
  fields: Record<string, string>,
  file?: { buffer: Buffer; filename: string; mime: string },
): Promise<{ status: number; data: unknown }> {
  const payload = file ?? loadPng();
  const form = new FormData();
  form.append('file', new Blob([payload.buffer], { type: payload.mime }), payload.filename);
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

function isGcsUnavailable(status: number): boolean {
  return status === 503;
}

async function expectUploadOk(
  label: string,
  headers: Record<string, string>,
  fields: Record<string, string>,
): Promise<void> {
  const { status, data } = await upload(headers, fields);
  if (isGcsUnavailable(status)) {
    console.warn(`  SKIP ${label} — GCS not configured (503)`);
    return;
  }
  if (status !== 200 && status !== 201) {
    throw new Error(`${label}: expected 200, got ${status} ${JSON.stringify(data)}`);
  }
  const url = (data as { url?: string }).url;
  if (!url) throw new Error(`${label}: missing url in response`);
  const head = await fetch(url, { method: 'HEAD' });
  if (!head.ok) {
    throw new Error(`${label}: public HEAD failed ${head.status}`);
  }
  console.log(`  ${label} → OK (HEAD ${head.status})`);
}

async function expectStatus(
  label: string,
  expected: number,
  headers: Record<string, string>,
  fields: Record<string, string>,
  file?: { buffer: Buffer; filename: string; mime: string },
): Promise<void> {
  const { status, data } = await upload(headers, fields, file);
  if (expected === 503 && isGcsUnavailable(status)) {
    console.warn(`  SKIP ${label} — GCS not configured (503)`);
    return;
  }
  if (status !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${status} ${JSON.stringify(data)}`);
  }
  console.log(`  ${label} → ${status} OK`);
}

async function main() {
  if (process.env.SMOKE_SKIP_GCS_UPLOAD === '1') {
    console.log('smoke:storage-global — skipped (SMOKE_SKIP_GCS_UPLOAD=1)');
    return;
  }

  const creds = getSmokeCredentials();
  if (!creds) {
    console.error(smokeCredentialsHelp());
    process.exit(1);
  }

  const adminAuth = await resolveSmokeAuth({ allowDevFallback: false, exitOnFailure: true });
  console.log('smoke:storage-global —', smokeApiBase());
  console.log('  Auth (admin):', adminAuth.label);

  await expectUploadOk(
    'ADMIN platform banner',
    adminAuth.headers,
    { scope: 'platform', purpose: 'banner' },
  );

  const rentalLocationId = process.env.SMOKE_RENTAL_LOCATION_ID?.trim();
  if (rentalLocationId) {
    await expectUploadOk(
      'ADMIN rental cover',
      adminAuth.headers,
      { scope: 'rental', purpose: 'cover', entityId: rentalLocationId },
    );
  } else {
    console.log('  Skip ADMIN rental (set SMOKE_RENTAL_LOCATION_ID)');
  }

  await expectUploadOk(
    'ADMIN event cover (tenant-demo staging)',
    adminAuth.headers,
    { scope: 'event', purpose: 'cover', entityId: 'tenant-demo' },
  );

  const excursionOperatorId = process.env.SMOKE_EXCURSION_OPERATOR_ID?.trim();
  if (excursionOperatorId) {
    await expectUploadOk(
      'ADMIN excursion cover',
      adminAuth.headers,
      { scope: 'excursion', purpose: 'cover', entityId: excursionOperatorId },
    );
  } else {
    console.log('  Skip ADMIN excursion (set SMOKE_EXCURSION_OPERATOR_ID)');
  }

  const ephemeral = await registerSmokeUser('storage-global');
  if (!ephemeral) throw new Error('Could not register ephemeral USER');
  await expectStatus(
    'USER platform upload',
    403,
    { Authorization: `Bearer ${ephemeral.token}` },
    { scope: 'platform', purpose: 'banner' },
  );

  const producerEmail = process.env.SMOKE_PRODUCER_EMAIL?.trim().toLowerCase();
  const producerPassword =
    process.env.SMOKE_PRODUCER_PASSWORD ?? process.env.SMOKE_USER_PASSWORD;
  const producerProfileId = process.env.SMOKE_PRODUCER_PROFILE_ID?.trim();
  const otherProducerProfileId = process.env.SMOKE_PRODUCER_OTHER_PROFILE_ID?.trim();
  const producerEventId = process.env.SMOKE_PRODUCER_EVENT_ID?.trim();

  if (producerEmail && producerPassword && producerProfileId) {
    const producer = await login(producerEmail, producerPassword);
    if (!producer) throw new Error('SMOKE_PRODUCER_EMAIL login failed');

    await expectUploadOk(
      'PRODUCER own profile logo',
      { Authorization: `Bearer ${producer.token}` },
      { scope: 'producer', purpose: 'logo', entityId: producerProfileId },
    );

    if (producerEventId) {
      await expectUploadOk(
        'PRODUCER own event cover',
        { Authorization: `Bearer ${producer.token}` },
        { scope: 'event', purpose: 'cover', entityId: producerEventId },
      );
    }

    if (otherProducerProfileId) {
      await expectStatus(
        'PRODUCER cross-profile',
        403,
        { Authorization: `Bearer ${producer.token}` },
        { scope: 'producer', purpose: 'logo', entityId: otherProducerProfileId },
      );
    }
  } else {
    console.log('  Skip PRODUCER tests (SMOKE_PRODUCER_EMAIL + SMOKE_PRODUCER_PROFILE_ID)');
  }

  const gastroProfileId = process.env.SMOKE_GASTRO_PROFILE_ID?.trim();
  const gastroOtherId = process.env.SMOKE_GASTRO_OTHER_PROFILE_ID?.trim();
  if (producerEmail && producerPassword && gastroProfileId) {
    const gastroUser = await login(producerEmail, producerPassword);
    if (!gastroUser) throw new Error('Gastro owner login failed');
    await expectUploadOk(
      'GASTRO own profile cover',
      { Authorization: `Bearer ${gastroUser.token}` },
      { scope: 'gastro', purpose: 'cover', entityId: gastroProfileId },
    );
    if (gastroOtherId) {
      await expectStatus(
        'GASTRO cross-profile',
        403,
        { Authorization: `Bearer ${gastroUser.token}` },
        { scope: 'gastro', purpose: 'cover', entityId: gastroOtherId },
      );
    }
  } else {
    console.log('  Skip GASTRO tests (SMOKE_GASTRO_PROFILE_ID + gastro owner login)');
  }

  const hotelProfileId = process.env.SMOKE_HOTEL_PROFILE_ID?.trim();
  const hotelOtherId = process.env.SMOKE_HOTEL_OTHER_PROFILE_ID?.trim();
  if (producerEmail && producerPassword && hotelProfileId) {
    const hotelUser = await login(producerEmail, producerPassword);
    if (!hotelUser) throw new Error('Hotel owner login failed');
    await expectUploadOk(
      'HOTEL own profile logo',
      { Authorization: `Bearer ${hotelUser.token}` },
      { scope: 'hotel', purpose: 'logo', entityId: hotelProfileId },
    );
    if (hotelOtherId) {
      await expectStatus(
        'HOTEL cross-profile',
        403,
        { Authorization: `Bearer ${hotelUser.token}` },
        { scope: 'hotel', purpose: 'logo', entityId: hotelOtherId },
      );
    }
  } else {
    console.log('  Skip HOTEL tests (SMOKE_HOTEL_PROFILE_ID + hotel owner login)');
  }

  await expectStatus(
    'Invalid MIME (text/plain)',
    400,
    adminAuth.headers,
    { scope: 'platform', purpose: 'banner' },
    { buffer: Buffer.from('not-an-image', 'utf8'), filename: 'bad.txt', mime: 'text/plain' },
  );

  const oversize = Buffer.alloc(5 * 1024 * 1024 + 1, 0xff);
  oversize[0] = 0x89;
  oversize[1] = 0x50;
  oversize[2] = 0x4e;
  oversize[3] = 0x47;
  await expectStatus(
    'File > 5 MB',
    400,
    adminAuth.headers,
    { scope: 'platform', purpose: 'banner' },
    { buffer: oversize, filename: 'huge.png', mime: 'image/png' },
  );

  console.log('smoke:storage-global — PASS');
}

runSmokeScript('smoke:storage-global', main);
