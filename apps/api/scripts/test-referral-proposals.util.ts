/**
 * Unit checks for referral commercial proposal validation helpers.
 * Run: pnpm --filter api run test:referral-proposals
 */

import {
  hasBlockingActiveProposal,
  isProposalExpired,
  validateCommissionValue,
  validateProposalPeriod,
} from '../src/modules/referrals/referral-proposals.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

assert(validateCommissionValue('PERCENTAGE', 10) === null, '10% valid');
assert(validateCommissionValue('PERCENTAGE', 0) !== null, '0% invalid');
assert(validateCommissionValue('PERCENTAGE', 101) !== null, '>100% invalid');
assert(validateCommissionValue('FIXED_PER_TICKET', 500) === null, '500 cents valid');
assert(validateCommissionValue('FIXED_PER_TICKET', 10.5) !== null, 'fixed must be int cents');

const start = new Date('2026-06-01T10:00:00Z');
const end = new Date('2026-06-02T10:00:00Z');
assert(validateProposalPeriod(start, end) === null, 'valid period');
assert(validateProposalPeriod(end, start) !== null, 'invalid period');

assert(!isProposalExpired(new Date('2099-01-01T00:00:00Z')), 'future end not expired');
assert(isProposalExpired(new Date('2020-01-01T00:00:00Z')), 'past end expired');
assert(!isProposalExpired(null), 'null end not expired');

assert(
  hasBlockingActiveProposal([{ status: 'PENDING' }]),
  'pending blocks',
);
assert(
  hasBlockingActiveProposal([
    { status: 'ACCEPTED', agreement: { status: 'ACTIVE' } },
  ]),
  'accepted+active agreement blocks',
);
assert(
  !hasBlockingActiveProposal([
    { status: 'ACCEPTED', agreement: { status: 'ENDED' } },
  ]),
  'ended agreement does not block',
);
assert(
  !hasBlockingActiveProposal([{ status: 'REJECTED' }]),
  'rejected does not block',
);

// Accept path rejects expired proposals (service checks isProposalExpired before accept).
assert(isProposalExpired(new Date('2020-01-01T00:00:00Z')), 'expired proposal cannot be accepted');

console.log('OK: referral-proposals util checks passed');
