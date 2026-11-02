/**
 * G12.1-C — «Denunciar valoración» (review dispute) rules for managed portals.
 * G12.1-C — Reglas de «Denunciar valoración» en portales gestionados.
 */

export type ReviewReportScope = 'producer' | 'gastro' | 'hotel';

export const REVIEW_REPORT_ACTION_LABEL = 'Denunciar';

/** Portals whose owners can report reviews (backend enforces ownership / ADMIN). */
const REPORTABLE_SCOPES: ReadonlySet<ReviewReportScope> = new Set(['producer', 'gastro']);

export function canReportManagedReview(scope: ReviewReportScope): boolean {
  return REPORTABLE_SCOPES.has(scope);
}

/** Admin queue label for the owner of a disputed review. */
export function reviewDisputeOwnerLabel(dispute: {
  ownerType?: 'PRODUCER' | 'GASTRO';
  producerDisplayName?: string | null;
  gastroDisplayName?: string | null;
}): { kind: string; name: string } {
  if (dispute.ownerType === 'GASTRO') {
    return { kind: 'Local', name: dispute.gastroDisplayName?.trim() || 'Local gastronómico' };
  }
  return { kind: 'Productora', name: dispute.producerDisplayName?.trim() || 'Productora' };
}
