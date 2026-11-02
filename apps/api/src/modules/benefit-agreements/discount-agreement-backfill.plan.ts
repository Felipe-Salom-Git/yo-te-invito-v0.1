import {
  benefitAgreementCalendarKeyFromInstant,
  benefitAgreementRangesOverlap,
  gastroDiscountStartOfDay,
  isBenefitAgreementActiveOnDate,
} from '@yo-te-invito/shared';

/**
 * G10.A4 — pure backfill planner (no I/O).
 * EN: copies each legacy profile-scoped GASTRO agreement segment to every billable discount of the
 *     same profile, clipped to the discount lifetime. Never invents terms: a profile without legacy
 *     agreements yields no copies (its discounts are reported as without coverage, fail-closed).
 * ES: copia cada segmento del acuerdo legacy del local a cada descuento facturable del mismo local,
 *     recortado a la vida del descuento. Nunca inventa términos.
 */

export type BackfillLegacyAgreement = {
  id: string;
  tenantId: string;
  gastroProfileId: string;
  unitPriceCents: bigint;
  barterMultiplier: string;
  currency: string;
  validFrom: Date;
  validTo: Date | null;
};

export type BackfillExistingDiscountAgreement = {
  id: string;
  derivedFromAgreementId: string | null;
  validFrom: Date;
  validTo: Date | null;
};

export type BackfillDiscount = {
  id: string;
  tenantId: string;
  gastroProfileId: string | null;
  status: string;
  visibility: string;
  archivedAt: Date | null;
  createdAt: Date;
  fundedCourtesy: boolean;
  validationCount: number;
  /** validatedAt of claim validations without allocation (need historical pricing). */
  pendingValidatedAt: Date[];
  existingAgreements: BackfillExistingDiscountAgreement[];
};

export type BackfillDiscountDecision =
  | 'CANDIDATE'
  | 'SKIP_NO_PROFILE'
  | 'SKIP_FUNDED_COURTESY'
  | 'SKIP_REJECTED_NO_VALIDATIONS'
  | 'SKIP_TERMINAL_NO_PENDING'
  | 'SKIP_OWN_AGREEMENTS';

export type BackfillCopy = {
  legacyAgreementId: string;
  tenantId: string;
  gastroProfileId: string;
  gastroDiscountId: string;
  unitPriceCents: bigint;
  barterMultiplier: string;
  currency: string;
  validFrom: Date;
  validTo: Date | null;
  /** validFrom moved forward to the discount creation day (no coverage before it existed). */
  clipped: boolean;
};

export type BackfillUncoveredReason = 'PROFILE_WITHOUT_AGREEMENTS' | 'NO_SEGMENT_IN_LIFETIME' | 'LEGACY_OVERLAP';

export type BackfillPlan = {
  profilesScanned: number;
  legacyAgreements: number;
  discountsScanned: number;
  candidates: string[];
  copies: BackfillCopy[];
  alreadyExisting: Array<{ legacyAgreementId: string; gastroDiscountId: string }>;
  profilesWithoutAgreements: string[];
  discountsWithoutProfile: string[];
  fundedCourtesiesSkipped: string[];
  rejectedWithoutValidationsSkipped: string[];
  terminalWithoutPendingSkipped: string[];
  ownAgreementsSkipped: string[];
  discountsWithoutCoverage: Array<{
    gastroDiscountId: string;
    gastroProfileId: string;
    reason: BackfillUncoveredReason;
    pendingValidationCount: number;
  }>;
  /** Pending validations whose date no (planned or existing) agreement covers → MISSING_AGREEMENT. */
  pendingValidationsUncovered: Array<{ gastroDiscountId: string; count: number }>;
};

const TERMINAL_STATUSES = new Set(['EXPIRED', 'REJECTED']);

export function classifyDiscountForBackfill(d: BackfillDiscount): BackfillDiscountDecision {
  if (!d.gastroProfileId) return 'SKIP_NO_PROFILE';
  if (d.fundedCourtesy) return 'SKIP_FUNDED_COURTESY';
  if (d.status === 'REJECTED' && d.validationCount === 0) return 'SKIP_REJECTED_NO_VALIDATIONS';
  if (d.existingAgreements.some((a) => a.derivedFromAgreementId == null)) return 'SKIP_OWN_AGREEMENTS';
  const terminal =
    d.archivedAt != null ||
    TERMINAL_STATUSES.has(d.status) ||
    (d.visibility === 'COURTESY_ONLY' && d.status === 'CANCELLED');
  if (terminal && d.pendingValidatedAt.length === 0) return 'SKIP_TERMINAL_NO_PENDING';
  return 'CANDIDATE';
}

const keyOf = (d: Date) => benefitAgreementCalendarKeyFromInstant(d);

/** Segment of a legacy agreement clipped to the discount lifetime, or null if it ended before. */
export function clipLegacySegmentToDiscount(
  legacy: BackfillLegacyAgreement,
  discountCreatedAt: Date,
): { validFrom: Date; validTo: Date | null; clipped: boolean } | null {
  const createdKey = keyOf(discountCreatedAt);
  const toKey = legacy.validTo ? keyOf(legacy.validTo) : null;
  if (toKey != null && toKey < createdKey) return null;
  if (keyOf(legacy.validFrom) >= createdKey) {
    return { validFrom: legacy.validFrom, validTo: legacy.validTo, clipped: false };
  }
  const [y, m, d] = createdKey.split('-').map((p) => parseInt(p, 10));
  return { validFrom: gastroDiscountStartOfDay(y!, m!, d!), validTo: legacy.validTo, clipped: true };
}

type Range = { fromKey: string; toKey: string | null };
const rangeOf = (from: Date, to: Date | null): Range => ({ fromKey: keyOf(from), toKey: to ? keyOf(to) : null });

function anyOverlap(ranges: Range[]): boolean {
  for (let i = 0; i < ranges.length; i += 1) {
    for (let j = i + 1; j < ranges.length; j += 1) {
      if (benefitAgreementRangesOverlap(ranges[i]!.fromKey, ranges[i]!.toKey, ranges[j]!.fromKey, ranges[j]!.toKey)) {
        return true;
      }
    }
  }
  return false;
}

export function planDiscountAgreementBackfill(input: {
  legacy: BackfillLegacyAgreement[];
  discounts: BackfillDiscount[];
}): BackfillPlan {
  const legacyByProfile = new Map<string, BackfillLegacyAgreement[]>();
  for (const row of input.legacy) {
    const list = legacyByProfile.get(row.gastroProfileId) ?? [];
    list.push(row);
    legacyByProfile.set(row.gastroProfileId, list);
  }

  const plan: BackfillPlan = {
    profilesScanned: 0,
    legacyAgreements: input.legacy.length,
    discountsScanned: input.discounts.length,
    candidates: [],
    copies: [],
    alreadyExisting: [],
    profilesWithoutAgreements: [],
    discountsWithoutProfile: [],
    fundedCourtesiesSkipped: [],
    rejectedWithoutValidationsSkipped: [],
    terminalWithoutPendingSkipped: [],
    ownAgreementsSkipped: [],
    discountsWithoutCoverage: [],
    pendingValidationsUncovered: [],
  };

  const profiles = new Set<string>(legacyByProfile.keys());
  const profilesWithoutAgreements = new Set<string>();

  for (const d of input.discounts) {
    if (d.gastroProfileId) profiles.add(d.gastroProfileId);
    const decision = classifyDiscountForBackfill(d);
    if (decision === 'SKIP_NO_PROFILE') plan.discountsWithoutProfile.push(d.id);
    else if (decision === 'SKIP_FUNDED_COURTESY') plan.fundedCourtesiesSkipped.push(d.id);
    else if (decision === 'SKIP_REJECTED_NO_VALIDATIONS') plan.rejectedWithoutValidationsSkipped.push(d.id);
    else if (decision === 'SKIP_TERMINAL_NO_PENDING') plan.terminalWithoutPendingSkipped.push(d.id);
    else if (decision === 'SKIP_OWN_AGREEMENTS') plan.ownAgreementsSkipped.push(d.id);
    if (decision !== 'CANDIDATE') continue;

    const profileId = d.gastroProfileId!;
    plan.candidates.push(d.id);
    const legacyRows = legacyByProfile.get(profileId) ?? [];
    if (legacyRows.length === 0) {
      profilesWithoutAgreements.add(profileId);
      plan.discountsWithoutCoverage.push({
        gastroDiscountId: d.id,
        gastroProfileId: profileId,
        reason: 'PROFILE_WITHOUT_AGREEMENTS',
        pendingValidationCount: d.pendingValidatedAt.length,
      });
      pushUncovered(plan, d, []);
      continue;
    }

    const alreadyCopied = new Set(
      d.existingAgreements.map((a) => a.derivedFromAgreementId).filter((id): id is string => id != null),
    );
    const planned: BackfillCopy[] = [];
    for (const legacy of legacyRows) {
      if (alreadyCopied.has(legacy.id)) {
        plan.alreadyExisting.push({ legacyAgreementId: legacy.id, gastroDiscountId: d.id });
        continue;
      }
      const segment = clipLegacySegmentToDiscount(legacy, d.createdAt);
      if (!segment) continue;
      planned.push({
        legacyAgreementId: legacy.id,
        tenantId: legacy.tenantId,
        gastroProfileId: profileId,
        gastroDiscountId: d.id,
        unitPriceCents: legacy.unitPriceCents,
        barterMultiplier: legacy.barterMultiplier,
        currency: legacy.currency,
        ...segment,
      });
    }

    const allRanges = [
      ...d.existingAgreements.map((a) => rangeOf(a.validFrom, a.validTo)),
      ...planned.map((c) => rangeOf(c.validFrom, c.validTo)),
    ];
    if (anyOverlap(allRanges)) {
      plan.discountsWithoutCoverage.push({
        gastroDiscountId: d.id,
        gastroProfileId: profileId,
        reason: 'LEGACY_OVERLAP',
        pendingValidationCount: d.pendingValidatedAt.length,
      });
      pushUncovered(plan, d, d.existingAgreements.map((a) => rangeOf(a.validFrom, a.validTo)));
      continue;
    }

    if (planned.length === 0 && d.existingAgreements.length === 0) {
      plan.discountsWithoutCoverage.push({
        gastroDiscountId: d.id,
        gastroProfileId: profileId,
        reason: 'NO_SEGMENT_IN_LIFETIME',
        pendingValidationCount: d.pendingValidatedAt.length,
      });
    }
    plan.copies.push(...planned);
    pushUncovered(plan, d, allRanges);
  }

  plan.profilesScanned = profiles.size;
  plan.profilesWithoutAgreements = [...profilesWithoutAgreements].sort();
  return plan;
}

function pushUncovered(plan: BackfillPlan, d: BackfillDiscount, ranges: Range[]) {
  const uncovered = d.pendingValidatedAt.filter((at) => {
    const key = keyOf(at);
    return !ranges.some((r) => isBenefitAgreementActiveOnDate(r.fromKey, r.toKey, key));
  }).length;
  if (uncovered > 0) plan.pendingValidationsUncovered.push({ gastroDiscountId: d.id, count: uncovered });
}
