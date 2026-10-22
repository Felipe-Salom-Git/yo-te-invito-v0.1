/**
 * G2.6 — Compatibility suite for gastro taxonomy (primary/secondary/tags/legacy).
 * Run: pnpm --filter api run test:gastro-taxonomy-compat
 *
 * Delegates to focused G2.1–G2.5 util scripts (no DB required).
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const scripts = [
  'test-gastro-primary-subcategory-name.util.ts',
  'test-gastro-subcategory-selection.util.ts',
  'test-gastro-event-tags.util.ts',
  'test-admin-gastro-taxonomy-payload.util.ts',
  'test-gastro-discovery-subcategory-filter.util.ts',
];

const dir = __dirname;
let failed = 0;

for (const file of scripts) {
  const full = path.join(dir, file);
  console.log(`\n=== ${file} ===`);
  const result = spawnSync(process.execPath, ['--import', 'tsx', full], {
    stdio: 'inherit',
    cwd: path.join(dir, '..'),
    env: process.env,
  });
  if (result.status !== 0) {
    failed += 1;
    console.error(`FAILED: ${file} (exit ${result.status})`);
  }
}

if (failed > 0) {
  console.error(`\nG2.6 compat suite: ${failed}/${scripts.length} failed`);
  process.exit(1);
}

console.log(`\nG2.6 compat suite: all ${scripts.length} taxonomy checks passed.`);
