import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ErrorCode,
  type AcceptReferralCommercialProposalResponse,
  type CreateReferralCommercialProposalInput,
  type ReferralCommercialProposalDto,
  type ReferralCommercialProposalList,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ReferralsService } from './referrals.service';
import { referralCheckoutUrl } from '../../common/referral-checkout-url';
import {
  hasBlockingActiveProposal,
  isProposalExpired,
  validateCommissionValue,
  validateProposalPeriod,
} from './referral-proposals.util';

const proposalInclude = {
  event: { select: { id: true, title: true, status: true, startAt: true } },
  referrerProfile: { select: { id: true, displayName: true, publicHandle: true } },
  producerProfile: { select: { id: true, displayName: true } },
  agreement: {
    include: {
      referralLink: { select: { id: true, code: true, label: true, eventId: true } },
    },
  },
} as const;

type ProposalRow = Prisma.ReferralCommercialProposalGetPayload<{ include: typeof proposalInclude }>;

@Injectable()
export class ReferralProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referrals: ReferralsService,
  ) {}

  async createForProducer(
    tenantId: string,
    producerProfileId: string,
    body: CreateReferralCommercialProposalInput,
  ): Promise<ReferralCommercialProposalDto> {
    const commissionErr = validateCommissionValue(body.commissionType, body.commissionValue);
    if (commissionErr) {
      throw new BadRequestException({ code: ErrorCode.VALIDATION_FAILED, message: commissionErr });
    }

    const startAt = body.startAt ? new Date(body.startAt) : null;
    const endAt = body.endAt ? new Date(body.endAt) : null;
    const periodErr = validateProposalPeriod(startAt, endAt);
    if (periodErr) {
      throw new BadRequestException({ code: ErrorCode.VALIDATION_FAILED, message: periodErr });
    }

    const event = await this.prisma.event.findFirst({
      where: {
        id: body.eventId,
        tenantId,
        producerProfileId,
        deletedAt: null,
      },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.EVENT_NOT_FOUND,
        message: 'Evento no encontrado o no pertenece a tu productora',
      });
    }

    const referrer = await this.prisma.referrerProfile.findFirst({
      where: { id: body.referrerProfileId, tenantId, status: 'ACTIVE' },
    });
    if (!referrer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Referidor no encontrado o sin perfil activo',
      });
    }

    await this.assertNoBlockingProposal(
      tenantId,
      producerProfileId,
      body.referrerProfileId,
      body.eventId,
    );

    const row = await this.prisma.referralCommercialProposal.create({
      data: {
        tenantId,
        producerProfileId,
        referrerProfileId: body.referrerProfileId,
        eventId: body.eventId,
        commissionType: body.commissionType,
        commissionValue: body.commissionValue,
        message: body.message ?? null,
        terms: body.terms ?? null,
        startAt,
        endAt,
        status: 'PENDING',
      },
      include: proposalInclude,
    });

    return this.toDto(tenantId, row);
  }

  async listForProducer(
    tenantId: string,
    producerProfileId: string,
  ): Promise<ReferralCommercialProposalList> {
    const rows = await this.prisma.referralCommercialProposal.findMany({
      where: { tenantId, producerProfileId },
      include: proposalInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { proposals: rows.map((r) => this.toDto(tenantId, r)) };
  }

  async getForProducer(
    tenantId: string,
    producerProfileId: string,
    proposalId: string,
  ): Promise<ReferralCommercialProposalDto> {
    const row = await this.findProposalOrThrow(tenantId, proposalId);
    if (row.producerProfileId !== producerProfileId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'No autorizado' });
    }
    return this.toDto(tenantId, row);
  }

  async cancelForProducer(
    tenantId: string,
    producerProfileId: string,
    proposalId: string,
  ): Promise<ReferralCommercialProposalDto> {
    const row = await this.findProposalOrThrow(tenantId, proposalId);
    if (row.producerProfileId !== producerProfileId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'No autorizado' });
    }
    if (row.status !== 'PENDING') {
      throw new BadRequestException({
        code: ErrorCode.REFERRAL_PROPOSAL_NOT_PENDING,
        message: 'Solo podés cancelar propuestas pendientes',
      });
    }
    const updated = await this.prisma.referralCommercialProposal.update({
      where: { id: proposalId },
      data: { status: 'CANCELLED', respondedAt: new Date() },
      include: proposalInclude,
    });
    return this.toDto(tenantId, updated);
  }

  async listForReferrer(
    tenantId: string,
    referrerProfileId: string,
  ): Promise<ReferralCommercialProposalList> {
    const rows = await this.prisma.referralCommercialProposal.findMany({
      where: { tenantId, referrerProfileId },
      include: proposalInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { proposals: rows.map((r) => this.toDto(tenantId, r)) };
  }

  async getForReferrer(
    tenantId: string,
    referrerProfileId: string,
    proposalId: string,
  ): Promise<ReferralCommercialProposalDto> {
    const row = await this.findProposalOrThrow(tenantId, proposalId);
    if (row.referrerProfileId !== referrerProfileId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'No autorizado' });
    }
    return this.toDto(tenantId, row);
  }

  async acceptForReferrer(
    tenantId: string,
    referrerProfileId: string,
    proposalId: string,
  ): Promise<AcceptReferralCommercialProposalResponse> {
    const row = await this.findProposalOrThrow(tenantId, proposalId);
    if (row.referrerProfileId !== referrerProfileId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'No autorizado' });
    }
    if (row.status !== 'PENDING') {
      throw new BadRequestException({
        code: ErrorCode.REFERRAL_PROPOSAL_NOT_PENDING,
        message: 'Solo podés responder propuestas pendientes',
      });
    }
    if (isProposalExpired(row.endAt)) {
      await this.prisma.referralCommercialProposal.update({
        where: { id: proposalId },
        data: { status: 'EXPIRED', respondedAt: new Date() },
      });
      throw new BadRequestException({
        code: ErrorCode.REFERRAL_PROPOSAL_EXPIRED,
        message: 'La propuesta está vencida',
      });
    }

    const activeAgreement = await this.prisma.referralCommercialAgreement.findFirst({
      where: {
        tenantId,
        producerProfileId: row.producerProfileId,
        referrerProfileId: row.referrerProfileId,
        eventId: row.eventId,
        status: 'ACTIVE',
      },
    });
    if (activeAgreement) {
      throw new ConflictException({
        code: ErrorCode.REFERRAL_PROPOSAL_DUPLICATE,
        message: 'Ya existe un acuerdo comercial activo para este evento',
      });
    }

    await this.ensureProducerReferrerActive(row.producerProfileId, row.referrerProfileId);

    const assignmentResult = await this.referrals.createEventAssignment(
      tenantId,
      row.eventId,
      row.producerProfileId,
      row.referrerProfileId,
      0,
    );

    const acceptedAt = new Date();
    const commissionValue = Number(row.commissionValue);

    const result = await this.prisma.$transaction(async (tx) => {
      const agreement = await tx.referralCommercialAgreement.create({
        data: {
          tenantId,
          proposalId: row.id,
          producerProfileId: row.producerProfileId,
          referrerProfileId: row.referrerProfileId,
          eventId: row.eventId,
          referralLinkId: assignmentResult.referralLink.id,
          commissionType: row.commissionType,
          commissionValue: row.commissionValue,
          status: 'ACTIVE',
          acceptedAt,
        },
        include: {
          referralLink: { select: { id: true, code: true, label: true, eventId: true } },
        },
      });

      const proposal = await tx.referralCommercialProposal.update({
        where: { id: proposalId },
        data: { status: 'ACCEPTED', respondedAt: acceptedAt },
        include: proposalInclude,
      });

      return { proposal, agreement };
    });

    const proposalDto = this.toDto(tenantId, result.proposal);
    return {
      proposal: proposalDto,
      agreement: {
        id: result.agreement.id,
        status: result.agreement.status,
        acceptedAt: result.agreement.acceptedAt.toISOString(),
        commissionType: result.agreement.commissionType,
        commissionValue,
        referralLink: {
          id: result.agreement.referralLink.id,
          code: result.agreement.referralLink.code,
          url: referralCheckoutUrl(
            result.agreement.referralLink.eventId,
            tenantId,
            result.agreement.referralLink.code,
          ),
          label: result.agreement.referralLink.label,
        },
        assignmentId: assignmentResult.assignment.id,
      },
    };
  }

  async rejectForReferrer(
    tenantId: string,
    referrerProfileId: string,
    proposalId: string,
  ): Promise<ReferralCommercialProposalDto> {
    const row = await this.findProposalOrThrow(tenantId, proposalId);
    if (row.referrerProfileId !== referrerProfileId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'No autorizado' });
    }
    if (row.status !== 'PENDING') {
      throw new BadRequestException({
        code: ErrorCode.REFERRAL_PROPOSAL_NOT_PENDING,
        message: 'Solo podés responder propuestas pendientes',
      });
    }

    const updated = await this.prisma.referralCommercialProposal.update({
      where: { id: proposalId },
      data: { status: 'REJECTED', respondedAt: new Date() },
      include: proposalInclude,
    });
    return this.toDto(tenantId, updated);
  }

  private async findProposalOrThrow(
    tenantId: string,
    proposalId: string,
  ): Promise<ProposalRow> {
    const row = await this.prisma.referralCommercialProposal.findFirst({
      where: { id: proposalId, tenantId },
      include: proposalInclude,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Propuesta no encontrada',
      });
    }
    return row;
  }

  private async assertNoBlockingProposal(
    tenantId: string,
    producerProfileId: string,
    referrerProfileId: string,
    eventId: string,
  ): Promise<void> {
    const existing = await this.prisma.referralCommercialProposal.findMany({
      where: { tenantId, producerProfileId, referrerProfileId, eventId },
      select: {
        status: true,
        agreement: { select: { status: true } },
      },
    });
    if (hasBlockingActiveProposal(existing)) {
      throw new ConflictException({
        code: ErrorCode.REFERRAL_PROPOSAL_DUPLICATE,
        message:
          'Ya existe una propuesta pendiente o un acuerdo activo para este evento y referidor',
      });
    }
  }

  private async ensureProducerReferrerActive(
    producerProfileId: string,
    referrerProfileId: string,
  ): Promise<void> {
    const existing = await this.prisma.producerReferrerRelationship.findUnique({
      where: {
        producerProfileId_referrerProfileId: { producerProfileId, referrerProfileId },
      },
    });

    if (!existing) {
      await this.prisma.producerReferrerRelationship.create({
        data: {
          producerProfileId,
          referrerProfileId,
          status: 'ACTIVE',
          origin: 'INVITED_BY_PRODUCER',
        },
      });
      return;
    }

    if (existing.status === 'ACTIVE') return;

    if (existing.status === 'BLOCKED') {
      throw new ConflictException({
        code: ErrorCode.ASSOCIATION_BLOCKED,
        message: 'La relación con esta productora está bloqueada',
      });
    }

    if (existing.status === 'REJECTED') {
      throw new ConflictException({
        code: ErrorCode.ASSOCIATION_INVALID_TRANSITION,
        message: 'La relación con esta productora fue rechazada',
      });
    }

    if (existing.status === 'PENDING') {
      await this.prisma.producerReferrerRelationship.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE' },
      });
    }
  }

  private toDto(tenantId: string, row: ProposalRow): ReferralCommercialProposalDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      producerProfileId: row.producerProfileId,
      referrerProfileId: row.referrerProfileId,
      eventId: row.eventId,
      commissionType: row.commissionType,
      commissionValue: Number(row.commissionValue),
      message: row.message,
      terms: row.terms,
      startAt: row.startAt?.toISOString() ?? null,
      endAt: row.endAt?.toISOString() ?? null,
      status: row.status,
      respondedAt: row.respondedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      event: row.event
        ? {
            id: row.event.id,
            title: row.event.title,
            status: row.event.status,
            startAt: row.event.startAt.toISOString(),
          }
        : undefined,
      referrerProfile: row.referrerProfile
        ? {
            id: row.referrerProfile.id,
            displayName: row.referrerProfile.displayName,
            publicHandle: row.referrerProfile.publicHandle,
          }
        : undefined,
      producerProfile: row.producerProfile
        ? {
            id: row.producerProfile.id,
            displayName: row.producerProfile.displayName,
          }
        : undefined,
      agreement: row.agreement
        ? {
            id: row.agreement.id,
            status: row.agreement.status,
            acceptedAt: row.agreement.acceptedAt.toISOString(),
            referralLink: {
              id: row.agreement.referralLink.id,
              code: row.agreement.referralLink.code,
              url: referralCheckoutUrl(
                row.agreement.referralLink.eventId,
                tenantId,
                row.agreement.referralLink.code,
              ),
              label: row.agreement.referralLink.label,
            },
          }
        : null,
    };
  }
}
