/**
 * Unit checks for gastro multi-local ownership helpers.
 * Run: pnpm --filter api run test:gastro-multi-local
 */

import { GastroOwnershipService } from '../src/modules/gastro/gastro-ownership.service';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const now = new Date('2026-01-01T00:00:00Z');
const later = new Date('2026-02-01T00:00:00Z');

assert(
  GastroOwnershipService.pickDefaultProfileId([
    { id: 'pending', status: 'PENDING', updatedAt: later },
    { id: 'active', status: 'ACTIVE', updatedAt: now },
  ]) === 'active',
  'prefers ACTIVE profile',
);

assert(
  GastroOwnershipService.pickDefaultProfileId([
    { id: 'old', status: 'PENDING', updatedAt: now },
    { id: 'new', status: 'PENDING', updatedAt: later },
  ]) === 'new',
  'falls back to most recently updated',
);

assert(
  GastroOwnershipService.pickDefaultOperationalProfileId([
    { id: 'pending', status: 'PENDING', updatedAt: later },
    { id: 'active', status: 'ACTIVE', updatedAt: now },
  ]) === 'active',
  'operational pick ignores pending-only default',
);

assert(
  GastroOwnershipService.pickDefaultOperationalProfileId([
    { id: 'pending', status: 'PENDING', updatedAt: later },
  ]) === null,
  'no operational profile when only pending',
);

const PORTAL = ['DRAFT', 'PENDING', 'ACTIVE'] as const;
assert(PORTAL.includes('PENDING'), 'PENDING is a portal-manageable status');

console.log('\nAll gastro multi-local util checks passed.');
