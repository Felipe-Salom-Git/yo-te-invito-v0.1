import {
  formatBenefitMoneyCents,
  isSafeExternalHttpUrl,
  resolveDiscountTransferMaxCents,
  reverseBenefitSettlementTransferBodySchema,
  roundBarterCreditCents,
  type AllocateBenefitSettlementUsagesBody,
  type DiscountEconomicSettlementLine,
  type RegisterBenefitSettlementTransferBody,
  type ReverseBenefitSettlementTransferBody,
  type BenefitSettlementAllocationMode,
  type BenefitSettlementStatus,
  type GastroDiscountPendingBlockedReason,
  type GastroDiscountPendingValidation,
} from '@yo-te-invito/shared';

/**
 * G10.D3 — view-model for "Liquidar validaciones" in the admin discount detail (pure, no React).
 * EN: always explicit validationIds of ONE period (one settlement); never `count`.
 * ES: siempre validationIds explícitas de UN período (una liquidación); nunca `count`.
 */

export const SETTLE_VALIDATIONS_COPY = {
  title: 'Liquidar validaciones',
  intro:
    'Elegí validaciones pendientes y liquidalas como CASH (genera deuda a cobrar) o CANJE (acredita crédito al saldo del local). Cada período se liquida por separado.',
  assignCash: 'Asignar a CASH',
  assignBarter: 'Asignar a CANJE',
  liquidateAs: 'Liquidar como',
  cashOption: 'CASH — el local queda debiendo; el pago se registra después en «Registrar pago».',
  barterOption: 'CANJE — se acredita crédito al saldo general del local. No es una transferencia de dinero.',
  missingAgreement: 'Sin contrato vigente para la fecha de validación',
  settlementClosed: 'Liquidación del período cerrada',
  fundedCourtesy: 'Cortesía financiada con canje: sus usos no son facturables (ni CASH ni CANJE).',
  noPending: 'No hay validaciones pendientes de liquidar.',
  confirm: 'Confirmar',
  newSettlement: 'Se creará la liquidación del local para este período.',
} as const;

export const MODE_LABEL: Record<BenefitSettlementAllocationMode, string> = {
  CASH: 'CASH',
  BARTER: 'CANJE',
};

export const BLOCKED_REASON_LABEL: Record<GastroDiscountPendingBlockedReason, string> = {
  MISSING_AGREEMENT: SETTLE_VALIDATIONS_COPY.missingAgreement,
  FUNDED_COURTESY: 'Cortesía financiada (no facturable)',
  SETTLEMENT_CLOSED: SETTLE_VALIDATIONS_COPY.settlementClosed,
};

export type PendingPeriodGroup = {
  periodKey: string;
  settlementId: string | null;
  settlementStatus: BenefitSettlementStatus | null;
  rows: GastroDiscountPendingValidation[];
  allocatableCount: number;
};

/** Newest period first; rows keep the API order (oldest validation first). */
export function groupPendingByPeriod(rows: ReadonlyArray<GastroDiscountPendingValidation>): PendingPeriodGroup[] {
  const groups = new Map<string, PendingPeriodGroup>();
  for (const row of rows) {
    const group = groups.get(row.periodKey) ?? {
      periodKey: row.periodKey,
      settlementId: row.settlementId,
      settlementStatus: row.settlementStatus,
      rows: [],
      allocatableCount: 0,
    };
    group.rows.push(row);
    if (row.allocatable) group.allocatableCount += 1;
    groups.set(row.periodKey, group);
  }
  return [...groups.values()].sort((a, b) => b.periodKey.localeCompare(a.periodKey));
}

/** Only allocatable rows of the group can be selected (disabled rows stay visible). */
export function selectableIds(group: Pick<PendingPeriodGroup, 'rows'>): string[] {
  return group.rows.filter((r) => r.allocatable).map((r) => r.validationId);
}

export type SelectionPreview = { count: number; baseCents: string; creditCents: string | null };

/** Base = Σ snapshot unit price; CANJE credit = Σ round(base × multiplier). Final figures: backend. */
export function previewSelection(
  group: Pick<PendingPeriodGroup, 'rows'>,
  selected: ReadonlySet<string>,
  mode: BenefitSettlementAllocationMode,
): SelectionPreview {
  let base = BigInt(0);
  let credit = BigInt(0);
  let count = 0;
  for (const row of group.rows) {
    if (!row.allocatable || !selected.has(row.validationId) || row.unitPriceCents == null) continue;
    count += 1;
    base += BigInt(row.unitPriceCents);
    credit += roundBarterCreditCents(BigInt(row.unitPriceCents), row.barterMultiplier ?? '1');
  }
  return {
    count,
    baseCents: base.toString(),
    creditCents: mode === 'BARTER' ? credit.toString() : null,
  };
}

export type DiscountAssignmentRequest = {
  periodKey: string;
  settlementId: string | null;
  body: AllocateBenefitSettlementUsagesBody;
};

/** Explicit, discount-scoped allocation body (backend re-checks every id belongs to the discount). */
export function buildDiscountAssignmentRequest(
  group: PendingPeriodGroup,
  selected: ReadonlySet<string>,
  mode: BenefitSettlementAllocationMode,
  gastroDiscountId: string,
): DiscountAssignmentRequest | null {
  const validationIds = selectableIds(group).filter((id) => selected.has(id));
  if (validationIds.length === 0) return null;
  return {
    periodKey: group.periodKey,
    settlementId: group.settlementId,
    body: { mode, validationIds, gastroDiscountId },
  };
}

// ── G10.D4 — register / reverse CASH payments of the discount ──

export const DISCOUNT_PAYMENT_COPY = {
  register: 'Registrar pago',
  reverse: 'Revertir pago',
  registerTitle: 'Registrar pago CASH del descuento',
  reverseTitle: 'Revertir pago',
  mode: 'Modo: CASH (transferencia de dinero). El CANJE no se paga: se liquida al asignar.',
  settlementLabel: 'Período / liquidación',
  remainingLabel: 'Saldo CASH del descuento en esa liquidación',
  cappedBySettlement:
    'La liquidación tiene pagos sin atribuir: el máximo admitido es el pendiente de la liquidación.',
  noPayable: 'No hay saldo CASH pendiente de este descuento. Primero asigná validaciones a CASH.',
  proofHint: 'URL del comprobante (banco, Drive). La subida de archivos privados no está habilitada todavía.',
  reverseHint: 'El pago no se borra: queda registrado como revertido y deja de contar como pagado.',
  reasonRequired: 'Indicá el motivo de la reversión (máx. 500 caracteres).',
} as const;

export type PayableSettlementOption = {
  settlementId: string;
  periodKey: string;
  discountRemainingCents: string;
  settlementOutstandingCents: string;
  maxCents: string;
  cappedBySettlement: boolean;
};

/** Only settlements where the discount still has CASH due > CASH paid. */
export function payableSettlementOptions(
  lines: ReadonlyArray<
    Pick<
      DiscountEconomicSettlementLine,
      'settlementId' | 'periodKey' | 'discountCashDueCents' | 'discountCashPaidCents' | 'discountCashRemainingCents' | 'settlementCashOutstandingCents'
    >
  >,
): PayableSettlementOption[] {
  return lines
    .filter((l) => BigInt(l.discountCashDueCents) > BigInt(l.discountCashPaidCents))
    .map((l) => {
      const max = resolveDiscountTransferMaxCents({
        discountCashDueCents: BigInt(l.discountCashDueCents),
        discountCashPaidCents: BigInt(l.discountCashPaidCents),
        settlementCashOutstandingCents: BigInt(l.settlementCashOutstandingCents),
      });
      return {
        settlementId: l.settlementId,
        periodKey: l.periodKey,
        discountRemainingCents: l.discountCashRemainingCents,
        settlementOutstandingCents: l.settlementCashOutstandingCents,
        maxCents: max.toString(),
        cappedBySettlement: max < BigInt(l.discountCashRemainingCents),
      };
    });
}

export type DiscountPaymentForm = {
  amountCents: string;
  date: string;
  reference: string;
  notes: string;
  proofUrl: string;
};

export type DiscountPaymentBodyResult =
  | { ok: true; body: RegisterBenefitSettlementTransferBody }
  | { ok: false; error: string };

/** Client-side mirror of the backend guards (the server re-validates everything). */
export function buildDiscountPaymentBody(
  form: DiscountPaymentForm,
  option: Pick<PayableSettlementOption, 'maxCents'> | null,
  gastroDiscountId: string,
): DiscountPaymentBodyResult {
  if (!option) return { ok: false, error: 'Elegí la liquidación a la que corresponde el pago.' };
  if (BigInt(form.amountCents || '0') <= BigInt(0)) return { ok: false, error: 'Ingresá un monto válido.' };
  if (BigInt(form.amountCents) > BigInt(option.maxCents)) {
    return { ok: false, error: `El monto supera el saldo CASH del descuento (${formatBenefitMoneyCents(option.maxCents)}).` };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return { ok: false, error: 'Indicá la fecha del pago.' };
  if (form.proofUrl.trim() && !isSafeExternalHttpUrl(form.proofUrl)) {
    return { ok: false, error: 'El comprobante debe ser un link http:// o https://' };
  }
  return {
    ok: true,
    body: {
      amountCents: form.amountCents,
      currency: 'ARS',
      transferredAt: new Date(`${form.date}T12:00:00.000Z`).toISOString(),
      gastroDiscountId,
      ...(form.reference.trim() ? { reference: form.reference.trim() } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      ...(form.proofUrl.trim() ? { proofUrl: form.proofUrl.trim() } : {}),
    },
  };
}

export function parseReversalReason(
  reason: string,
): { ok: true; body: ReverseBenefitSettlementTransferBody } | { ok: false; error: string } {
  const parsed = reverseBenefitSettlementTransferBodySchema.safeParse({ reason });
  return parsed.success ? { ok: true, body: parsed.data } : { ok: false, error: DISCOUNT_PAYMENT_COPY.reasonRequired };
}
