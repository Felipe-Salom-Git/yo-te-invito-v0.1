import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  ErrorCode,
  benefitAgreementCalendarKeyFromInstant,
  benefitAgreementMatchesDiscountProfile,
  benefitAgreementPreviousCalendarDay,
  benefitAgreementRangesOverlap,
  gastroDiscountEndOfDay,
  gastroDiscountStartOfDay,
  isBenefitAgreementReadOnly,
  parseMoneyCentsString,
  type BenefitCommercialAgreementDto,
  type BenefitCommercialAgreementPartnerHistoryQuery,
  type BenefitCommercialAgreementPartnerHistoryResponse,
  type BenefitCommercialAgreementResolveQuery,
  type BenefitCommercialAgreementResolveResponse,
  type BenefitCommercialAgreementsListQuery,
  type CloseBenefitCommercialAgreementBody,
  type CreateBenefitCommercialAgreementBody,
  type ReplaceBenefitCommercialAgreementBody,
  type UpdateBenefitCommercialAgreementNotesBody,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AGREEMENT_DISPLAY_INCLUDE,
  agreementScopeKeyFromRow,
  agreementScopeWhere,
  legacyReadOnlyError,
  lockAgreementScope,
  mapAgreementWriteConflict,
  type AgreementScopeKey,
} from './benefit-agreement-scope.util';
import {
  agreementAuditSnapshot,
  agreementRowToDto,
  parseAgreementDateKey,
  pickApplicableAgreement,
  todayAgreementKey,
  type AgreementRow,
} from './benefit-agreement-dto.util';

type Actor = { id: string; role: string };

/**
 * Commercial agreements (Etapa 9 + G10).
 * G10: GASTRO agreements are discount-scoped; legacy profile-scoped rows are read-only history
 * and never resolved for new pricing. ACTIVITY (operator-scoped) is unchanged.
 */
@Injectable()
export class BenefitCommercialAgreementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: BenefitCommercialAgreementsListQuery) {
    const where = this.buildListWhere(tenantId, query);
    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await Promise.all([
      this.prisma.benefitCommercialAgreement.count({ where }),
      this.prisma.benefitCommercialAgreement.findMany({
        where,
        include: AGREEMENT_DISPLAY_INCLUDE,
        orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.pageSize,
      }),
    ]);
    const todayKey = todayAgreementKey();
    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      data: rows.map((row) => agreementRowToDto(row, todayKey)),
    };
  }

  async get(tenantId: string, id: string): Promise<BenefitCommercialAgreementDto> {
    return agreementRowToDto(await this.require(tenantId, id), todayAgreementKey());
  }

  /**
   * Partner history. GASTRO = legacy profile-scoped rows only (read-only, pre-G10);
   * discount history lives in `BenefitDiscountAgreementHistoryService`.
   */
  async partnerHistory(
    tenantId: string,
    query: BenefitCommercialAgreementPartnerHistoryQuery,
  ): Promise<BenefitCommercialAgreementPartnerHistoryResponse> {
    const key: AgreementScopeKey =
      query.vertical === 'GASTRO'
        ? { scope: 'PROFILE_LEGACY', gastroProfileId: query.gastroProfileId! }
        : { scope: 'OPERATOR', excursionOperatorId: query.excursionOperatorId! };
    const rows = await this.findScopeRows(tenantId, key);
    const todayKey = todayAgreementKey();
    return {
      vertical: query.vertical,
      gastroProfileId: query.gastroProfileId ?? null,
      excursionOperatorId: query.excursionOperatorId ?? null,
      partnerDisplayName:
        rows[0]?.gastroProfile?.displayName ?? rows[0]?.excursionOperator?.name ?? null,
      current: pickApplicableAgreement(rows, todayKey, new Date()),
      history: rows.map((row) => agreementRowToDto(row, todayKey)),
    };
  }

  /**
   * Canonical resolution of the agreement applicable on a date (inclusive AR calendar vigency).
   * GASTRO + gastroDiscountId → only that discount's agreements (never legacy rows).
   * GASTRO + gastroProfileId only → legacy profile row (transitional approval gate until G10.B).
   */
  async resolveApplicable(
    tenantId: string,
    query: BenefitCommercialAgreementResolveQuery,
  ): Promise<BenefitCommercialAgreementResolveResponse> {
    const onDateKey = query.onDate ?? todayAgreementKey();
    const onInstant = gastroDiscountStartOfDay(...parseAgreementDateKey(onDateKey));
    const key = await this.resolveQueryScope(tenantId, query);
    const rows = key ? await this.findScopeRows(tenantId, key) : [];
    return {
      vertical: query.vertical,
      gastroProfileId: key && key.scope !== 'OPERATOR' ? key.gastroProfileId : query.gastroProfileId ?? null,
      gastroDiscountId: query.gastroDiscountId ?? null,
      excursionOperatorId: query.excursionOperatorId ?? null,
      onDate: onDateKey,
      agreement: pickApplicableAgreement(rows, todayAgreementKey(), onInstant),
    };
  }

  async create(
    tenantId: string,
    actor: Actor,
    body: CreateBenefitCommercialAgreementBody,
  ): Promise<BenefitCommercialAgreementDto> {
    const key = await this.assertCreateScopeEligible(tenantId, body);
    const validFrom = gastroDiscountStartOfDay(...parseAgreementDateKey(body.validFrom));
    const validTo = body.validTo
      ? gastroDiscountEndOfDay(...parseAgreementDateKey(body.validTo))
      : null;
    const row = await this.prisma
      .$transaction(
        async (tx) => {
          await lockAgreementScope(tx, tenantId, key);
          await this.assertNoOverlap(tx, tenantId, key, {
            validFromKey: body.validFrom,
            validToKey: body.validTo ?? null,
          });
          return tx.benefitCommercialAgreement.create({
            data: {
              tenantId,
              vertical: body.vertical,
              gastroProfileId: body.gastroProfileId ?? null,
              gastroDiscountId: body.gastroDiscountId ?? null,
              excursionOperatorId: body.excursionOperatorId ?? null,
              unitPriceCents: parseMoneyCentsString(body.unitPriceCents),
              barterMultiplier: new Decimal(body.barterMultiplier),
              currency: body.currency,
              validFrom,
              validTo,
              notes: body.notes ?? null,
              createdByUserId: actor.id,
            },
            include: AGREEMENT_DISPLAY_INCLUDE,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch(mapAgreementWriteConflict);
    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_AGREEMENT_CREATED',
      entityType: 'BenefitCommercialAgreement',
      entityId: row.id,
      after: agreementAuditSnapshot(row),
    });
    return agreementRowToDto(row, todayAgreementKey());
  }

  async close(
    tenantId: string,
    actor: Actor,
    id: string,
    body: CloseBenefitCommercialAgreementBody,
  ): Promise<BenefitCommercialAgreementDto> {
    const row = await this.requireWritable(tenantId, id);
    if (row.validTo != null) {
      throw new ConflictException({
        code: ErrorCode.BENEFIT_AGREEMENT_ALREADY_CLOSED,
        message: 'Agreement is already closed',
      });
    }
    const validFromKey = benefitAgreementCalendarKeyFromInstant(row.validFrom);
    if (body.validTo < validFromKey) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_AGREEMENT_INVALID_EFFECTIVE_DATE,
        message: 'validTo cannot be before validFrom',
      });
    }
    const validTo = gastroDiscountEndOfDay(...parseAgreementDateKey(body.validTo));
    const updated = await this.prisma.benefitCommercialAgreement.update({
      where: { id: row.id },
      data: { validTo },
      include: AGREEMENT_DISPLAY_INCLUDE,
    });
    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_AGREEMENT_CLOSED',
      entityType: 'BenefitCommercialAgreement',
      entityId: updated.id,
      before: agreementAuditSnapshot(row),
      after: agreementAuditSnapshot(updated),
    });
    return agreementRowToDto(updated, todayAgreementKey());
  }

  async replace(
    tenantId: string,
    actor: Actor,
    id: string,
    body: ReplaceBenefitCommercialAgreementBody,
  ): Promise<{ closed: BenefitCommercialAgreementDto; created: BenefitCommercialAgreementDto }> {
    const row = await this.requireWritable(tenantId, id);
    const key = agreementScopeKeyFromRow(row);
    const closeTo = gastroDiscountEndOfDay(
      ...parseAgreementDateKey(benefitAgreementPreviousCalendarDay(body.effectiveFrom)),
    );
    const newFrom = gastroDiscountStartOfDay(...parseAgreementDateKey(body.effectiveFrom));

    const result = await this.prisma
      .$transaction(
        async (tx) => {
          await lockAgreementScope(tx, tenantId, key);
          const fresh = await tx.benefitCommercialAgreement.findFirstOrThrow({ where: { id: row.id, tenantId } });
          if (fresh.validTo != null) {
            throw new ConflictException({
              code: ErrorCode.BENEFIT_AGREEMENT_ALREADY_CLOSED,
              message: 'Cannot replace a closed agreement; create a new one instead',
            });
          }
          if (body.effectiveFrom <= benefitAgreementCalendarKeyFromInstant(fresh.validFrom)) {
            throw new BadRequestException({
              code: ErrorCode.BENEFIT_AGREEMENT_INVALID_EFFECTIVE_DATE,
              message: 'effectiveFrom must be after the current agreement validFrom',
            });
          }
          const closed = await tx.benefitCommercialAgreement.update({
            where: { id: row.id },
            data: { validTo: closeTo },
            include: AGREEMENT_DISPLAY_INCLUDE,
          });
          await this.assertNoOverlap(
            tx,
            tenantId,
            key,
            { validFromKey: body.effectiveFrom, validToKey: null },
            row.id,
          );
          const created = await tx.benefitCommercialAgreement.create({
            data: {
              tenantId,
              vertical: row.vertical,
              gastroProfileId: row.gastroProfileId,
              gastroDiscountId: row.gastroDiscountId,
              excursionOperatorId: row.excursionOperatorId,
              unitPriceCents: parseMoneyCentsString(body.unitPriceCents),
              barterMultiplier: new Decimal(body.barterMultiplier),
              currency: body.currency,
              validFrom: newFrom,
              notes: body.notes ?? null,
              createdByUserId: actor.id,
            },
            include: AGREEMENT_DISPLAY_INCLUDE,
          });
          return { closed, created };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch(mapAgreementWriteConflict);

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_AGREEMENT_REPLACED',
      entityType: 'BenefitCommercialAgreement',
      entityId: result.created.id,
      metadata: { replacedAgreementId: row.id },
      before: agreementAuditSnapshot(row),
      after: agreementAuditSnapshot(result.created),
    });
    const todayKey = todayAgreementKey();
    return {
      closed: agreementRowToDto(result.closed, todayKey),
      created: agreementRowToDto(result.created, todayKey),
    };
  }

  async updateNotes(
    tenantId: string,
    actor: Actor,
    id: string,
    body: UpdateBenefitCommercialAgreementNotesBody,
  ): Promise<BenefitCommercialAgreementDto> {
    const row = await this.requireWritable(tenantId, id);
    const updated = await this.prisma.benefitCommercialAgreement.update({
      where: { id: row.id },
      data: { notes: body.notes },
      include: AGREEMENT_DISPLAY_INCLUDE,
    });
    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_AGREEMENT_NOTES_UPDATED',
      entityType: 'BenefitCommercialAgreement',
      entityId: updated.id,
      before: { notes: row.notes },
      after: { notes: updated.notes },
    });
    return agreementRowToDto(updated, todayAgreementKey());
  }

  private findScopeRows(tenantId: string, key: AgreementScopeKey): Promise<AgreementRow[]> {
    return this.prisma.benefitCommercialAgreement.findMany({
      where: agreementScopeWhere(tenantId, key),
      include: AGREEMENT_DISPLAY_INCLUDE,
      orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /** Discount scope requires the discount to belong to the tenant (and to `gastroProfileId` if given). */
  private async resolveQueryScope(
    tenantId: string,
    query: BenefitCommercialAgreementResolveQuery,
  ): Promise<AgreementScopeKey | null> {
    if (query.vertical === 'ACTIVITY') {
      return { scope: 'OPERATOR', excursionOperatorId: query.excursionOperatorId! };
    }
    if (!query.gastroDiscountId) {
      return { scope: 'PROFILE_LEGACY', gastroProfileId: query.gastroProfileId! };
    }
    const discount = await this.prisma.gastroDiscount.findFirst({
      where: { id: query.gastroDiscountId, tenantId },
      select: { gastroProfileId: true },
    });
    if (!discount) {
      throw new NotFoundException({
        code: ErrorCode.BENEFIT_AGREEMENT_PARTNER_INVALID,
        message: 'Gastro discount not found for tenant',
      });
    }
    if (query.gastroProfileId && query.gastroProfileId !== discount.gastroProfileId) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_AGREEMENT_PARTNER_INVALID,
        message: 'Discount does not belong to this gastro profile',
      });
    }
    if (!discount.gastroProfileId) return null;
    return {
      scope: 'DISCOUNT',
      gastroProfileId: discount.gastroProfileId,
      gastroDiscountId: query.gastroDiscountId,
    };
  }

  private buildListWhere(
    tenantId: string,
    query: BenefitCommercialAgreementsListQuery,
  ): Prisma.BenefitCommercialAgreementWhereInput {
    const todayKey = todayAgreementKey();
    const [y, m, d] = parseAgreementDateKey(todayKey);
    const todayStart = gastroDiscountStartOfDay(y, m, d);
    const todayEnd = gastroDiscountEndOfDay(y, m, d);
    let vigencyWhere: Prisma.BenefitCommercialAgreementWhereInput = {};
    if (query.vigency === 'CURRENT') {
      vigencyWhere = {
        validFrom: { lte: todayEnd },
        OR: [{ validTo: null }, { validTo: { gte: todayStart } }],
      };
    } else if (query.vigency === 'FUTURE') {
      vigencyWhere = { validFrom: { gt: todayEnd } };
    } else if (query.vigency === 'PAST') {
      vigencyWhere = { validTo: { lt: todayStart } };
    }
    const scopeWhere: Prisma.BenefitCommercialAgreementWhereInput =
      query.scope === 'DISCOUNT'
        ? { vertical: 'GASTRO', gastroDiscountId: { not: null } }
        : query.scope === 'PROFILE_LEGACY'
          ? { vertical: 'GASTRO', gastroDiscountId: null }
          : query.scope === 'OPERATOR'
            ? { vertical: 'ACTIVITY' }
            : {};
    return {
      tenantId,
      ...vigencyWhere,
      AND: [scopeWhere],
      ...(query.vertical ? { vertical: query.vertical } : {}),
      ...(query.gastroProfileId ? { gastroProfileId: query.gastroProfileId } : {}),
      ...(query.gastroDiscountId ? { gastroDiscountId: query.gastroDiscountId } : {}),
      ...(query.excursionOperatorId ? { excursionOperatorId: query.excursionOperatorId } : {}),
    };
  }

  private async require(tenantId: string, id: string): Promise<AgreementRow> {
    const row = await this.prisma.benefitCommercialAgreement.findFirst({
      where: { id, tenantId },
      include: AGREEMENT_DISPLAY_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND,
        message: 'Benefit commercial agreement not found',
      });
    }
    return row;
  }

  /** D-G10-10 — legacy profile-scoped rows cannot be closed, replaced or edited. */
  private async requireWritable(tenantId: string, id: string): Promise<AgreementRow> {
    const row = await this.require(tenantId, id);
    if (isBenefitAgreementReadOnly(row)) throw legacyReadOnlyError();
    return row;
  }

  /**
   * GASTRO: discount in tenant + discount.gastroProfileId == supplied profile (no cross-profile)
   * + profile ACTIVE. ACTIVITY: operator active (unchanged).
   */
  private async assertCreateScopeEligible(
    tenantId: string,
    body: CreateBenefitCommercialAgreementBody,
  ): Promise<AgreementScopeKey> {
    if (body.vertical === 'GASTRO') {
      // D-G10-10 (defense in depth beyond Zod): never a new profile-scoped GASTRO row, and never
      // `findFirst({ id: undefined })`, which would match any discount of the tenant.
      if (!body.gastroDiscountId || !body.gastroProfileId) {
        throw new BadRequestException({
          code: ErrorCode.BENEFIT_AGREEMENT_PARTNER_INVALID,
          message: 'GASTRO agreements require gastroProfileId + gastroDiscountId',
        });
      }
      const discount = await this.prisma.gastroDiscount.findFirst({
        where: { id: body.gastroDiscountId, tenantId },
        select: { gastroProfileId: true },
      });
      if (!discount) {
        throw new BadRequestException({
          code: ErrorCode.BENEFIT_AGREEMENT_PARTNER_INVALID,
          message: 'Gastro discount not found for tenant',
        });
      }
      if (!benefitAgreementMatchesDiscountProfile(body.gastroProfileId, discount.gastroProfileId)) {
        throw new BadRequestException({
          code: ErrorCode.BENEFIT_AGREEMENT_PARTNER_INVALID,
          message: 'Discount does not belong to this gastro profile',
        });
      }
      const profile = await this.prisma.gastroProfile.findFirst({
        where: { id: body.gastroProfileId, tenantId },
        select: { status: true },
      });
      if (!profile) {
        throw new BadRequestException({
          code: ErrorCode.BENEFIT_AGREEMENT_PARTNER_INVALID,
          message: 'Gastro profile not found for tenant',
        });
      }
      if (profile.status !== 'ACTIVE') {
        throw new BadRequestException({
          code: ErrorCode.BENEFIT_AGREEMENT_PARTNER_NOT_ELIGIBLE,
          message: 'Gastro profile must be ACTIVE to create a new agreement',
        });
      }
      return {
        scope: 'DISCOUNT',
        gastroProfileId: body.gastroProfileId!,
        gastroDiscountId: body.gastroDiscountId!,
      };
    }
    const operator = await this.prisma.excursionOperator.findFirst({
      where: { id: body.excursionOperatorId, tenantId, deletedAt: null },
    });
    if (!operator) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_AGREEMENT_PARTNER_INVALID,
        message: 'Excursion operator not found for tenant',
      });
    }
    if (!operator.isActive) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_AGREEMENT_PARTNER_NOT_ELIGIBLE,
        message: 'Excursion operator must be active to create a new agreement',
      });
    }
    return { scope: 'OPERATOR', excursionOperatorId: body.excursionOperatorId! };
  }

  /** Runs inside the scope-locked Serializable transaction (never outside). */
  private async assertNoOverlap(
    tx: Prisma.TransactionClient,
    tenantId: string,
    key: AgreementScopeKey,
    candidate: { validFromKey: string; validToKey: string | null },
    excludeId?: string,
  ): Promise<void> {
    const existing = await tx.benefitCommercialAgreement.findMany({
      where: {
        ...agreementScopeWhere(tenantId, key),
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { validFrom: true, validTo: true },
    });
    for (const row of existing) {
      const fromKey = benefitAgreementCalendarKeyFromInstant(row.validFrom);
      const toKey = row.validTo ? benefitAgreementCalendarKeyFromInstant(row.validTo) : null;
      if (benefitAgreementRangesOverlap(fromKey, toKey, candidate.validFromKey, candidate.validToKey)) {
        throw new ConflictException({
          code: ErrorCode.BENEFIT_AGREEMENT_OVERLAP,
          message: 'Agreement date range overlaps an existing agreement for this scope',
        });
      }
    }
  }
}
