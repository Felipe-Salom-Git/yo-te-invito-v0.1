/**
 * Consolidated legal module smoke (Slice Legal Admin 8).
 * Run: pnpm --filter api run smoke:legal
 *
 * Requires API (DEV_AUTH_ENABLED or JWT) and tenant-demo legal seed.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(scriptsDir, '..');

function runScript(name: string): boolean {
  console.log(`\n=== ${name} ===\n`);
  const scriptPath = path.join(scriptsDir, name);
  const result = spawnSync('npx', ['tsx', scriptPath], {
    stdio: 'inherit',
    env: process.env,
    cwd: apiRoot,
  });
  return result.status === 0;
}

function main() {
  const steps = ['test-legal-documents.ts', 'test-me-legal-acceptance.ts'];
  for (const step of steps) {
    if (!runScript(step)) {
      console.error(`\nLegal smoke failed at ${step}`);
      process.exit(1);
    }
  }
  console.log('\nAll legal smokes passed (documents + user acceptance).');
}

main();
