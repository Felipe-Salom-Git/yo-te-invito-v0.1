import type { ReferralCommissionType } from '@yo-te-invito/shared';

export function validateCommissionValue(
  commissionType: ReferralCommissionType,
  commissionValue: number,
): string | null {
  if (commissionValue <= 0) {
    return 'commissionValue debe ser mayor a 0';
  }
  if (commissionType === 'PERCENTAGE') {
    if (commissionValue > 100) {
      return 'El porcentaje no puede superar 100';
    }
    return null;
  }
  if (!Number.isInteger(commissionValue)) {
    return 'El monto fijo por entrada debe expresarse en centavos (entero)';
  }
  return null;
}

export function validateProposalPeriod(
  startAt: Date | null | undefined,
  endAt: Date | null | undefined,
): string | null {
  if (startAt && endAt && startAt.getTime() >= endAt.getTime()) {
    return 'startAt debe ser anterior a endAt';
  }
  return null;
}

/** Propuesta vencida si endAt pasó (solo aplica a PENDING en aceptación). */
export function isProposalExpired(endAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!endAt) return false;
  return endAt.getTime() < now.getTime();
}

export type BlockingProposalShape = {
  status: string;
  agreement?: { status: string } | null;
};

/** Bloquea PENDING o ACCEPTED con acuerdo ACTIVE. */
export function hasBlockingActiveProposal(rows: BlockingProposalShape[]): boolean {
  return rows.some(
    (r) =>
      r.status === 'PENDING' ||
      (r.status === 'ACCEPTED' && r.agreement?.status === 'ACTIVE'),
  );
}
