import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { BenefitCommercialAgreement } from '@prisma/client';
import { ErrorCode } from '@yo-te-invito/shared';

/**
 * G10 — single source of truth for agreement scope queries.
 * EN: every agreement query goes through `agreementScopeWhere` so legacy profile rows and
 *     discount-scoped rows are never mixed.
 * ES: toda consulta de acuerdos pasa por `agreementScopeWhere` para no mezclar filas legacy
 *     del local con filas por descuento.
 */
export type AgreementScopeKey =
  | { scope: 'DISCOUNT'; gastroProfileId: string; gastroDiscountId: string }
  | { scope: 'PROFILE_LEGACY'; gastroProfileId: string }
  | { scope: 'OPERATOR'; excursionOperatorId: string };

export const AGREEMENT_DISPLAY_INCLUDE = {
  gastroProfile: { select: { displayName: true } },
  gastroDiscount: { select: { displayTitle: true, status: true } },
  excursionOperator: { select: { name: true } },
} satisfies Prisma.BenefitCommercialAgreementInclude;

export function agreementScopeWhere(
  tenantId: string,
  key: AgreementScopeKey,
): Prisma.BenefitCommercialAgreementWhereInput {
  switch (key.scope) {
    case 'DISCOUNT':
      return {
        tenantId,
        vertical: 'GASTRO',
        gastroProfileId: key.gastroProfileId,
        gastroDiscountId: key.gastroDiscountId,
      };
    case 'PROFILE_LEGACY':
      return { tenantId, vertical: 'GASTRO', gastroProfileId: key.gastroProfileId, gastroDiscountId: null };
    case 'OPERATOR':
      return { tenantId, vertical: 'ACTIVITY', excursionOperatorId: key.excursionOperatorId };
  }
}

export function agreementScopeKeyFromRow(
  row: Pick<BenefitCommercialAgreement, 'vertical' | 'gastroProfileId' | 'gastroDiscountId' | 'excursionOperatorId'>,
): AgreementScopeKey {
  if (row.vertical === 'ACTIVITY') {
    return { scope: 'OPERATOR', excursionOperatorId: row.excursionOperatorId! };
  }
  if (row.gastroDiscountId) {
    return { scope: 'DISCOUNT', gastroProfileId: row.gastroProfileId!, gastroDiscountId: row.gastroDiscountId };
  }
  return { scope: 'PROFILE_LEGACY', gastroProfileId: row.gastroProfileId! };
}

/**
 * Row lock that serializes create/replace for one scope (closes the pre-G10 overlap race).
 * Legacy profile scope is read-only: never locked for writes.
 */
export async function lockAgreementScope(
  tx: Prisma.TransactionClient,
  tenantId: string,
  key: AgreementScopeKey,
): Promise<void> {
  if (key.scope === 'DISCOUNT') {
    await tx.$executeRaw(
      Prisma.sql`SELECT id FROM "GastroDiscount" WHERE id = ${key.gastroDiscountId} AND "tenantId" = ${tenantId} FOR UPDATE`,
    );
    return;
  }
  if (key.scope === 'OPERATOR') {
    await tx.$executeRaw(
      Prisma.sql`SELECT id FROM "ExcursionOperator" WHERE id = ${key.excursionOperatorId} AND "tenantId" = ${tenantId} FOR UPDATE`,
    );
    return;
  }
  throw legacyReadOnlyError();
}

export function legacyReadOnlyError(): BadRequestException {
  return new BadRequestException({
    code: ErrorCode.BENEFIT_AGREEMENT_LEGACY_READ_ONLY,
    message:
      'Legacy profile-scoped agreements are read-only; create an agreement for the discount instead',
  });
}

/** Serializable conflicts (P2034) surface as a retryable overlap conflict, never as a 500. */
export function mapAgreementWriteConflict(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
    throw new ConflictException({
      code: ErrorCode.BENEFIT_AGREEMENT_OVERLAP,
      message: 'Concurrent agreement change for this scope; retry',
    });
  }
  throw err;
}
