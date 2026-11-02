/**
 * G10.C — economic timeline of ONE discount, built only from persisted facts
 * (agreement rows + agreement audit logs, allocations, ledger credits, attributed transfers).
 * EN: no synthetic events; allocations / credits of one operation are collapsed like the
 *     settlement history (same settlement + mode + actor + minute) with real counts and totals.
 * ES: sin hechos sintéticos; las allocations / créditos de una misma operación se agrupan como en
 *     el historial de liquidaciones (mismo settlement + modo + actor + minuto).
 */

import { benefitAgreementCalendarKeyFromInstant } from './benefit-commercial-agreements';
import { moneyCentsToString } from './money/benefit-money';

export const GASTRO_DISCOUNT_ECONOMIC_HISTORY_KINDS = [
  'AGREEMENT_CREATED',
  'AGREEMENT_CLOSED',
  'AGREEMENT_REPLACED',
  'ALLOCATED_CASH',
  'ALLOCATED_BARTER',
  'CREDIT_MATERIALIZED',
  'PAYMENT_REGISTERED',
  'PAYMENT_REVERSED',
] as const;
export type GastroDiscountEconomicHistoryKind =
  (typeof GASTRO_DISCOUNT_ECONOMIC_HISTORY_KINDS)[number];

export type DiscountEconomicHistoryEvent = {
  at: string;
  kind: GastroDiscountEconomicHistoryKind;
  amountCents: string | null;
  usageCount: number | null;
  settlementId: string | null;
  periodKey: string | null;
  agreementId: string | null;
  replacedAgreementId: string | null;
  transferId: string | null;
  reference: string | null;
  reason: string | null;
  /** Calendar date (AR) the fact refers to: contract start/end or transfer date. */
  effectiveDate: string | null;
  /** ADMIN only (stripped for GASTRO). */
  actorLabel: string | null;
};

export type DiscountHistoryAgreementInput = {
  id: string;
  createdAt: Date;
  validFrom: string;
  createdByUserId: string | null;
};

export type DiscountHistoryAgreementAuditInput = {
  action: 'BENEFIT_AGREEMENT_CREATED' | 'BENEFIT_AGREEMENT_CLOSED' | 'BENEFIT_AGREEMENT_REPLACED';
  entityId: string;
  createdAt: Date;
  actorId: string;
  validTo: string | null;
  replacedAgreementId: string | null;
};

export type DiscountHistoryAllocationInput = {
  id: string;
  settlementId: string;
  periodKey: string;
  mode: string;
  baseAmountCents: bigint;
  allocatedAt: Date;
  allocatedByUserId: string | null;
};

export type DiscountHistoryCreditInput = {
  id: string;
  sourceAllocationId: string;
  amountCents: bigint;
  createdAt: Date;
  createdByUserId: string | null;
};

export type DiscountHistoryTransferInput = {
  id: string;
  settlementId: string;
  periodKey: string;
  amountCents: bigint;
  transferredAt: Date;
  reference: string | null;
  createdAt: Date;
  registeredByUserId: string | null;
  reversedAt: Date | null;
  reversedByUserId: string | null;
  reversalReason: string | null;
};

const EMPTY: Omit<DiscountEconomicHistoryEvent, 'at' | 'kind'> = {
  amountCents: null,
  usageCount: null,
  settlementId: null,
  periodKey: null,
  agreementId: null,
  replacedAgreementId: null,
  transferId: null,
  reference: null,
  reason: null,
  effectiveDate: null,
  actorLabel: null,
};

function minuteKey(at: Date): string {
  return at.toISOString().slice(0, 16);
}

function label(labels: ReadonlyMap<string, string>, userId: string | null): string | null {
  return userId ? (labels.get(userId) ?? null) : null;
}

type Groupable = { at: Date; amount: bigint; settlementId: string; periodKey: string; actorId: string | null };

function collapse<T extends Groupable>(
  rows: T[],
  keyOf: (row: T) => string,
  toEvent: (first: T, count: number, amount: bigint) => DiscountEconomicHistoryEvent,
): DiscountEconomicHistoryEvent[] {
  const sorted = [...rows].sort((a, b) => a.at.getTime() - b.at.getTime());
  const groups = new Map<string, { first: T; count: number; amount: bigint }>();
  for (const row of sorted) {
    const key = keyOf(row);
    const group = groups.get(key);
    if (group) {
      group.count += 1;
      group.amount += row.amount;
    } else {
      groups.set(key, { first: row, count: 1, amount: row.amount });
    }
  }
  return [...groups.values()].map((g) => toEvent(g.first, g.count, g.amount));
}

export function buildDiscountEconomicHistory(input: {
  agreements: ReadonlyArray<DiscountHistoryAgreementInput>;
  agreementAudits: ReadonlyArray<DiscountHistoryAgreementAuditInput>;
  allocations: ReadonlyArray<DiscountHistoryAllocationInput>;
  credits: ReadonlyArray<DiscountHistoryCreditInput>;
  transfers: ReadonlyArray<DiscountHistoryTransferInput>;
  actorLabels: ReadonlyMap<string, string>;
}): DiscountEconomicHistoryEvent[] {
  const { actorLabels } = input;
  const events: DiscountEconomicHistoryEvent[] = [];
  const replaced = new Map(
    input.agreementAudits
      .filter((a) => a.action === 'BENEFIT_AGREEMENT_REPLACED')
      .map((a) => [a.entityId, a] as const),
  );
  const createdAudit = new Map(
    input.agreementAudits
      .filter((a) => a.action === 'BENEFIT_AGREEMENT_CREATED')
      .map((a) => [a.entityId, a] as const),
  );

  for (const agreement of input.agreements) {
    const replace = replaced.get(agreement.id);
    if (replace) {
      events.push({
        ...EMPTY,
        at: replace.createdAt.toISOString(),
        kind: 'AGREEMENT_REPLACED',
        agreementId: agreement.id,
        replacedAgreementId: replace.replacedAgreementId,
        effectiveDate: agreement.validFrom,
        actorLabel: label(actorLabels, replace.actorId),
      });
      continue;
    }
    const created = createdAudit.get(agreement.id);
    events.push({
      ...EMPTY,
      at: agreement.createdAt.toISOString(),
      kind: 'AGREEMENT_CREATED',
      agreementId: agreement.id,
      effectiveDate: agreement.validFrom,
      actorLabel: label(actorLabels, created?.actorId ?? agreement.createdByUserId),
    });
  }

  for (const audit of input.agreementAudits) {
    if (audit.action !== 'BENEFIT_AGREEMENT_CLOSED') continue;
    events.push({
      ...EMPTY,
      at: audit.createdAt.toISOString(),
      kind: 'AGREEMENT_CLOSED',
      agreementId: audit.entityId,
      effectiveDate: audit.validTo,
      actorLabel: label(actorLabels, audit.actorId),
    });
  }

  events.push(
    ...collapse(
      input.allocations.map((a) => ({
        at: a.allocatedAt,
        amount: a.baseAmountCents,
        settlementId: a.settlementId,
        periodKey: a.periodKey,
        actorId: a.allocatedByUserId,
        mode: a.mode,
      })),
      (r) => `${r.settlementId}|${r.mode}|${r.actorId ?? ''}|${minuteKey(r.at)}`,
      (first, count, amount) => ({
        ...EMPTY,
        at: first.at.toISOString(),
        kind: first.mode === 'BARTER' ? 'ALLOCATED_BARTER' : 'ALLOCATED_CASH',
        amountCents: moneyCentsToString(amount),
        usageCount: count,
        settlementId: first.settlementId,
        periodKey: first.periodKey,
        actorLabel: label(actorLabels, first.actorId),
      }),
    ),
  );

  const allocationById = new Map(input.allocations.map((a) => [a.id, a] as const));
  events.push(
    ...collapse(
      input.credits.flatMap((c) => {
        const allocation = allocationById.get(c.sourceAllocationId);
        if (!allocation) return [];
        return [
          {
            at: c.createdAt,
            amount: c.amountCents,
            settlementId: allocation.settlementId,
            periodKey: allocation.periodKey,
            actorId: c.createdByUserId,
          },
        ];
      }),
      (r) => `${r.settlementId}|${r.actorId ?? ''}|${minuteKey(r.at)}`,
      (first, count, amount) => ({
        ...EMPTY,
        at: first.at.toISOString(),
        kind: 'CREDIT_MATERIALIZED',
        amountCents: moneyCentsToString(amount),
        usageCount: count,
        settlementId: first.settlementId,
        periodKey: first.periodKey,
        actorLabel: label(actorLabels, first.actorId),
      }),
    ),
  );

  for (const t of input.transfers) {
    const base = {
      ...EMPTY,
      amountCents: moneyCentsToString(t.amountCents),
      settlementId: t.settlementId,
      periodKey: t.periodKey,
      transferId: t.id,
      reference: t.reference,
      effectiveDate: benefitAgreementCalendarKeyFromInstant(t.transferredAt),
    };
    events.push({
      ...base,
      at: t.createdAt.toISOString(),
      kind: 'PAYMENT_REGISTERED',
      actorLabel: label(actorLabels, t.registeredByUserId),
    });
    if (t.reversedAt) {
      events.push({
        ...base,
        at: t.reversedAt.toISOString(),
        kind: 'PAYMENT_REVERSED',
        reason: t.reversalReason,
        actorLabel: label(actorLabels, t.reversedByUserId),
      });
    }
  }

  const order = new Map(GASTRO_DISCOUNT_ECONOMIC_HISTORY_KINDS.map((k, i) => [k, i] as const));
  return events.sort(
    (a, b) => a.at.localeCompare(b.at) || (order.get(a.kind) ?? 0) - (order.get(b.kind) ?? 0),
  );
}
