import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import type { BenefitCommercialAgreement, Prisma } from '@prisma/client';
import {
  ErrorCode,
  benefitAgreementCalendarKeyFromInstant,
  benefitAgreementPreviousCalendarDay,
  benefitAgreementRangesOverlap,
  classifyBenefitAgreementVigency,
  gastroDiscountEndOfDay,
  gastroDiscountStartOfDay,
  moneyCentsToString,
  parseMoneyCentsString,
  type BenefitCommercialAgreementDto,
  type BenefitCommercialAgreementPartnerHistoryQuery,
  type BenefitCommercialAgreementPartnerHistoryResponse,
  type BenefitCommercialAgreementsListQuery,
  type CloseBenefitCommercialAgreementBody,
  type CreateBenefitCommercialAgreementBody,
  type ReplaceBenefitCommercialAgreementBody,
  type UpdateBenefitCommercialAgreementNotesBody,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type AgreementRow = BenefitCommercialAgreement & {
  gastroProfile?: { displayName: string } | null;
  excursionOperator?: { name: string } | null;
};

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
        include: {
          gastroProfile: { select: { displayName: true } },
          excursionOperator: { select: { name: true } },
        },
        orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.pageSize,
      }),
    ]);
    const todayKey = benefitAgreementCalendarKeyFromInstant(new Date());
    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      data: rows.map((row) => this.toDto(row, todayKey)),
    };
  }

  async get(tenantId: string, id: string): Promise<BenefitCommercialAgreementDto> {
    return this.toDto(await this.require(tenantId, id), benefitAgreementCalendarKeyFromInstant(new Date()));
  }

  async partnerHistory(
    tenantId: string,
    query: BenefitCommercialAgreementPartnerHistoryQuery,
  ): Promise<BenefitCommercialAgreementPartnerHistoryResponse> {
    const where = this.partnerWhere(tenantId, query.vertical, query.gastroProfileId, query.excursionOperatorId);
    const rows = await this.prisma.benefitCommercialAgreement.findMany({
      where,
      include: {
        gastroProfile: { select: { displayName: true } },
        excursionOperator: { select: { name: true } },
      },
      orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
    });
    const todayKey = benefitAgreementCalendarKeyFromInstant(new Date());
    const dtos = rows.map((row) => this.toDto(row, todayKey));
    const current = dtos.find((row) => row.vigency === 'CURRENT') ?? null;
    return {
      vertical: query.vertical,
      gastroProfileId: query.gastroProfileId ?? null,
      excursionOperatorId: query.excursionOperatorId ?? null,
      partnerDisplayName:
        rows[0]?.gastroProfile?.displayName ?? rows[0]?.excursionOperator?.name ?? null,
      current,
      history: dtos,
    };
  }

  async create(
    tenantId: string,
    actor: { id: string; role: string },
    body: CreateBenefitCommercialAgreementBody,
  ): Promise<BenefitCommercialAgreementDto> {
    await this.assertPartnerEligible(tenantId, body);
    const validFrom = gastroDiscountStartOfDay(...this.parseDateKey(body.validFrom));
    const validFromKey = body.validFrom;
    await this.assertNoOverlap(tenantId, body.vertical, body.gastroProfileId, body.excursionOperatorId, {
      validFromKey,
      validToKey: null,
    });
    const row = await this.prisma.benefitCommercialAgreement.create({
      data: {
        tenantId,
        vertical: body.vertical,
        gastroProfileId: body.gastroProfileId ?? null,
        excursionOperatorId: body.excursionOperatorId ?? null,
        unitPriceCents: parseMoneyCentsString(body.unitPriceCents),
        barterMultiplier: new Decimal(body.barterMultiplier),
        currency: body.currency,
        validFrom,
        notes: body.notes ?? null,
        createdByUserId: actor.id,
      },
      include: {
        gastroProfile: { select: { displayName: true } },
        excursionOperator: { select: { name: true } },
      },
    });
    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_AGREEMENT_CREATED',
      entityType: 'BenefitCommercialAgreement',
      entityId: row.id,
      after: this.auditSnapshot(row),
    });
    return this.toDto(row, benefitAgreementCalendarKeyFromInstant(new Date()));
  }

  async close(
    tenantId: string,
    actor: { id: string; role: string },
    id: string,
    body: CloseBenefitCommercialAgreementBody,
  ): Promise<BenefitCommercialAgreementDto> {
    const row = await this.require(tenantId, id);
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
    const validTo = gastroDiscountEndOfDay(...this.parseDateKey(body.validTo));
    const updated = await this.prisma.benefitCommercialAgreement.update({
      where: { id: row.id },
      data: { validTo },
      include: {
        gastroProfile: { select: { displayName: true } },
        excursionOperator: { select: { name: true } },
      },
    });
    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_AGREEMENT_CLOSED',
      entityType: 'BenefitCommercialAgreement',
      entityId: updated.id,
      before: this.auditSnapshot(row),
      after: this.auditSnapshot(updated),
    });
    return this.toDto(updated, benefitAgreementCalendarKeyFromInstant(new Date()));
  }

  async replace(
    tenantId: string,
    actor: { id: string; role: string },
    id: string,
    body: ReplaceBenefitCommercialAgreementBody,
  ): Promise<{ closed: BenefitCommercialAgreementDto; created: BenefitCommercialAgreementDto }> {
    const row = await this.require(tenantId, id);
    if (row.validTo != null) {
      throw new ConflictException({
        code: ErrorCode.BENEFIT_AGREEMENT_ALREADY_CLOSED,
        message: 'Cannot replace a closed agreement; create a new one instead',
      });
    }
    const currentFromKey = benefitAgreementCalendarKeyFromInstant(row.validFrom);
    if (body.effectiveFrom <= currentFromKey) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_AGREEMENT_INVALID_EFFECTIVE_DATE,
        message: 'effectiveFrom must be after the current agreement validFrom',
      });
    }
    const closeToKey = benefitAgreementPreviousCalendarDay(body.effectiveFrom);
    const closeTo = gastroDiscountEndOfDay(...this.parseDateKey(closeToKey));
    const newFrom = gastroDiscountStartOfDay(...this.parseDateKey(body.effectiveFrom));

    const result = await this.prisma.$transaction(async (tx) => {
      const closed = await tx.benefitCommercialAgreement.update({
        where: { id: row.id },
        data: { validTo: closeTo },
        include: {
          gastroProfile: { select: { displayName: true } },
          excursionOperator: { select: { name: true } },
        },
      });
      await this.assertNoOverlap(
        tenantId,
        row.vertical,
        row.gastroProfileId ?? undefined,
        row.excursionOperatorId ?? undefined,
        { validFromKey: body.effectiveFrom, validToKey: null },
        tx,
        row.id,
      );
      const created = await tx.benefitCommercialAgreement.create({
        data: {
          tenantId,
          vertical: row.vertical,
          gastroProfileId: row.gastroProfileId,
          excursionOperatorId: row.excursionOperatorId,
          unitPriceCents: parseMoneyCentsString(body.unitPriceCents),
          barterMultiplier: new Decimal(body.barterMultiplier),
          currency: body.currency,
          validFrom: newFrom,
          notes: body.notes ?? null,
          createdByUserId: actor.id,
        },
        include: {
          gastroProfile: { select: { displayName: true } },
          excursionOperator: { select: { name: true } },
        },
      });
      return { closed, created };
    });

    const todayKey = benefitAgreementCalendarKeyFromInstant(new Date());
    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_AGREEMENT_REPLACED',
      entityType: 'BenefitCommercialAgreement',
      entityId: result.created.id,
      metadata: { replacedAgreementId: row.id },
      before: this.auditSnapshot(row),
      after: this.auditSnapshot(result.created),
    });
    return {
      closed: this.toDto(result.closed, todayKey),
      created: this.toDto(result.created, todayKey),
    };
  }

  async updateNotes(
    tenantId: string,
    actor: { id: string; role: string },
    id: string,
    body: UpdateBenefitCommercialAgreementNotesBody,
  ): Promise<BenefitCommercialAgreementDto> {
    const row = await this.require(tenantId, id);
    const updated = await this.prisma.benefitCommercialAgreement.update({
      where: { id: row.id },
      data: { notes: body.notes },
      include: {
        gastroProfile: { select: { displayName: true } },
        excursionOperator: { select: { name: true } },
      },
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
    return this.toDto(updated, benefitAgreementCalendarKeyFromInstant(new Date()));
  }

  private buildListWhere(
    tenantId: string,
    query: BenefitCommercialAgreementsListQuery,
  ): Prisma.BenefitCommercialAgreementWhereInput {
    const todayKey = benefitAgreementCalendarKeyFromInstant(new Date());
    const [y, m, d] = this.parseDateKey(todayKey);
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
    return {
      tenantId,
      ...vigencyWhere,
      ...(query.vertical ? { vertical: query.vertical } : {}),
      ...(query.gastroProfileId ? { gastroProfileId: query.gastroProfileId } : {}),
      ...(query.excursionOperatorId ? { excursionOperatorId: query.excursionOperatorId } : {}),
    };
  }

  private partnerWhere(
    tenantId: string,
    vertical: CreateBenefitCommercialAgreementBody['vertical'],
    gastroProfileId?: string,
    excursionOperatorId?: string,
  ): Prisma.BenefitCommercialAgreementWhereInput {
    return {
      tenantId,
      vertical,
      ...(vertical === 'GASTRO' ? { gastroProfileId } : { excursionOperatorId }),
    };
  }

  private async require(tenantId: string, id: string): Promise<AgreementRow> {
    const row = await this.prisma.benefitCommercialAgreement.findFirst({
      where: { id, tenantId },
      include: {
        gastroProfile: { select: { displayName: true } },
        excursionOperator: { select: { name: true } },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND,
        message: 'Benefit commercial agreement not found',
      });
    }
    return row;
  }

  private async assertPartnerEligible(
    tenantId: string,
    body: CreateBenefitCommercialAgreementBody,
  ): Promise<void> {
    if (body.vertical === 'GASTRO') {
      const profile = await this.prisma.gastroProfile.findFirst({
        where: { id: body.gastroProfileId, tenantId },
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
      return;
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
  }

  private async assertNoOverlap(
    tenantId: string,
    vertical: CreateBenefitCommercialAgreementBody['vertical'],
    gastroProfileId: string | undefined,
    excursionOperatorId: string | undefined,
    candidate: { validFromKey: string; validToKey: string | null },
    tx: Prisma.TransactionClient = this.prisma,
    excludeId?: string,
  ): Promise<void> {
    const existing = await tx.benefitCommercialAgreement.findMany({
      where: {
        tenantId,
        vertical,
        ...(vertical === 'GASTRO' ? { gastroProfileId } : { excursionOperatorId }),
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    for (const row of existing) {
      const fromKey = benefitAgreementCalendarKeyFromInstant(row.validFrom);
      const toKey = row.validTo ? benefitAgreementCalendarKeyFromInstant(row.validTo) : null;
      if (
        benefitAgreementRangesOverlap(fromKey, toKey, candidate.validFromKey, candidate.validToKey)
      ) {
        throw new ConflictException({
          code: ErrorCode.BENEFIT_AGREEMENT_OVERLAP,
          message: 'Agreement date range overlaps an existing agreement for this partner',
        });
      }
    }
  }

  private parseDateKey(key: string): [number, number, number] {
    const [y, m, d] = key.split('-').map((p) => parseInt(p, 10));
    return [y, m, d];
  }

  private toDto(row: AgreementRow, todayKey: string): BenefitCommercialAgreementDto {
    const validFromKey = benefitAgreementCalendarKeyFromInstant(row.validFrom);
    const validToKey = row.validTo ? benefitAgreementCalendarKeyFromInstant(row.validTo) : null;
    return {
      id: row.id,
      tenantId: row.tenantId,
      vertical: row.vertical,
      gastroProfileId: row.gastroProfileId,
      excursionOperatorId: row.excursionOperatorId,
      partnerDisplayName: row.gastroProfile?.displayName ?? row.excursionOperator?.name ?? null,
      unitPriceCents: moneyCentsToString(row.unitPriceCents),
      barterMultiplier: row.barterMultiplier.toString(),
      currency: row.currency,
      validFrom: validFromKey,
      validTo: validToKey,
      vigency: classifyBenefitAgreementVigency(validFromKey, validToKey, todayKey),
      isOpen: row.validTo == null,
      notes: row.notes,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private auditSnapshot(row: BenefitCommercialAgreement) {
    return {
      vertical: row.vertical,
      gastroProfileId: row.gastroProfileId,
      excursionOperatorId: row.excursionOperatorId,
      unitPriceCents: moneyCentsToString(row.unitPriceCents),
      barterMultiplier: row.barterMultiplier.toString(),
      validFrom: benefitAgreementCalendarKeyFromInstant(row.validFrom),
      validTo: row.validTo ? benefitAgreementCalendarKeyFromInstant(row.validTo) : null,
    };
  }
}
