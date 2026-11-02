/**
 * G12.1-C — «Denunciar» is offered in producer + gastro portals; admin queue labels the owner.
 * Run: pnpm --filter api run test:gastro-review-report
 */
import { canReportManagedReview, REVIEW_REPORT_ACTION_LABEL, reviewDisputeOwnerLabel } from './reviewReport';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

assert(REVIEW_REPORT_ACTION_LABEL === 'Denunciar', 'action label is «Denunciar»');
assert(canReportManagedReview('producer'), 'producer portal keeps the report action');
assert(canReportManagedReview('gastro'), 'gastro portal (per local) recovers the report action');
assert(!canReportManagedReview('hotel'), 'hotel portal unchanged (no dispute domain)');

const gastro = reviewDisputeOwnerLabel({ ownerType: 'GASTRO', producerDisplayName: null, gastroDisplayName: 'Bodegón' });
assert(gastro.kind === 'Local' && gastro.name === 'Bodegón', 'admin queue shows the local for gastro disputes');
const producer = reviewDisputeOwnerLabel({ ownerType: 'PRODUCER', producerDisplayName: 'Prod SA', gastroDisplayName: null });
assert(producer.kind === 'Productora' && producer.name === 'Prod SA', 'admin queue keeps the producer label');
assert(reviewDisputeOwnerLabel({ ownerType: 'GASTRO' }).name === 'Local gastronómico', 'gastro fallback name when missing');

console.log('OK: review report ui rules');
