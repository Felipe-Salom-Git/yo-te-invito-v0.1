/**
 * Smoke: POST /uploads/public-image → GCS public bucket.
 *
 * Requires:
 *   - API running with GCS_PUBLIC_BUCKET (+ credentials) configured
 *   - SMOKE_USER_EMAIL + SMOKE_USER_PASSWORD (ADMIN account recommended)
 *
 * Optional:
 *   SMOKE_UPLOAD_FILE — path to JPEG/PNG/WEBP (default: embedded 1×1 PNG)
 *   SMOKE_SKIP_GCS_UPLOAD=1 — skip if GCS not configured (exit 0 with notice)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getSmokeCredentials,
  resolveSmokeAuth,
  smokeApiBase,
  smokeCredentialsHelp,
} from './lib/smoke-auth';
import { runSmokeScript } from './lib/smoke-runner';

const MIN_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function loadSmokeImage(): { buffer: Buffer; filename: string; mime: string } {
  const custom = process.env.SMOKE_UPLOAD_FILE?.trim();
  if (custom) {
    const path = resolve(custom);
    if (!existsSync(path)) {
      throw new Error(`SMOKE_UPLOAD_FILE not found: ${path}`);
    }
    const buffer = readFileSync(path);
    const lower = path.toLowerCase();
    const mime = lower.endsWith('.webp')
      ? 'image/webp'
      : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'image/png';
    return { buffer, filename: path.split(/[/\\]/).pop() ?? 'upload.bin', mime };
  }

  return {
    buffer: Buffer.from(MIN_PNG_BASE64, 'base64'),
    filename: 'smoke-upload-test.png',
    mime: 'image/png',
  };
}

async function main() {
  if (process.env.SMOKE_SKIP_GCS_UPLOAD === '1') {
    console.log('smoke:storage-upload — skipped (SMOKE_SKIP_GCS_UPLOAD=1)');
    return;
  }

  const creds = getSmokeCredentials();
  if (!creds) {
    console.error(smokeCredentialsHelp());
    process.exit(1);
  }

  const auth = await resolveSmokeAuth({ allowDevFallback: false, exitOnFailure: true });
  console.log('smoke:storage-upload —', smokeApiBase());
  console.log('  Auth:', auth.label);

  const { buffer, filename, mime } = loadSmokeImage();
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime }), filename);
  form.append('scope', 'platform');
  form.append('purpose', 'banner');

  const res = await fetch(`${smokeApiBase()}/uploads/public-image`, {
    method: 'POST',
    headers: {
      ...auth.headers,
    },
    body: form,
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (res.status === 503) {
    console.warn('smoke:storage-upload — GCS not configured on API (503). Set GCS_* env on API.');
    console.warn('  Response:', data);
    process.exit(0);
  }

  if (!res.ok) {
    console.error('Upload failed:', res.status, data);
    process.exit(1);
  }

  const payload = data as {
    url?: string;
    objectKey?: string;
    bucket?: string;
    contentType?: string;
    size?: number;
  };

  if (!payload.url || !payload.objectKey || !payload.bucket) {
    console.error('Invalid response shape:', payload);
    process.exit(1);
  }

  console.log('  Upload OK');
  console.log('  bucket:', payload.bucket);
  console.log('  objectKey:', payload.objectKey);
  console.log('  url:', payload.url);

  const head = await fetch(payload.url, { method: 'HEAD' });
  if (!head.ok) {
    console.error('Public URL HEAD failed:', head.status, head.statusText);
    process.exit(1);
  }

  console.log('  Public URL HEAD:', head.status);
  console.log('smoke:storage-upload — PASS');
  console.log('  Note: uploaded object is not deleted automatically; remove from GCS if desired.');
}

runSmokeScript('smoke:storage-upload', main);
