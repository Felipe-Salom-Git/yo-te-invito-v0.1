/**
 * DANGEROUS: drops all data and re-applies migrations (prisma migrate reset --force).
 *
 * Usage:
 *   pnpm db:reset-dangerous -- --confirm
 *
 * Does NOT preserve users or content. Prefer db:cleanup-content to keep felipe.e.salom@gmail.com.
 */

import { spawnSync } from 'child_process';

const args = process.argv.slice(2);

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_RESET !== 'true') {
  console.error('\n[db:reset-dangerous] BLOCKED: NODE_ENV=production');
  console.error('Set ALLOW_PRODUCTION_RESET=true only if you are absolutely sure.\n');
  process.exit(1);
}

if (!args.includes('--confirm')) {
  console.error('\n=== db:reset-dangerous (NOT RUN) ===\n');
  console.error('This command WIPES the entire database and re-runs all migrations.');
  console.error('All users (including felipe.e.salom@gmail.com) and content will be lost.');
  console.error('\nTo run:');
  console.error('  pnpm db:reset-dangerous -- --confirm\n');
  console.error('Safer alternative (keeps master user):');
  console.error('  pnpm db:cleanup-content              # dry-run');
  console.error('  pnpm db:cleanup-content -- --confirm\n');
  process.exit(1);
}

console.warn('\n!!! db:reset-dangerous — FULL DATABASE RESET in 3s !!!');
console.warn('Press Ctrl+C to abort...\n');
spawnSync('node', ['-e', 'setTimeout(() => {}, 3000)'], { stdio: 'inherit' });

const result = spawnSync('npx', ['prisma', 'migrate', 'reset', '--force'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  shell: true,
});

process.exit(result.status ?? 1);
