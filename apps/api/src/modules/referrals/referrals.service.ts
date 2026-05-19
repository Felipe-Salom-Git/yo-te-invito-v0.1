import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import type {
  CreateReferralLinkBody,
  CreateReferralLinkResponse,
  ReferralLinkSummary,
  ReferralCommission,
  AssignReferralsBody,
  AssignReferrerToEventResponse,
  ProducerEventAssignmentsResponse,
  ProducerFreelanceReferrersQuery,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { Prisma } from '@prisma/client';
import { referralCheckoutUrl } from '../../common/referral-checkout-url';

/** Referidor pidió asociación a la productora (la productora acepta/rechaza el pendiente) */
const REFERRER_INITIATED_ORIGINS = new Set<string>(['REQUESTED_BY_REFERRER']);
/**
 * Productora inició el pendiente: listado, invitación, o abriendo el link personal del referidor.
 * El referidor acepta/rechaza.
 */
const PRODUCER_INITIATED_ORIGINS = new Set<string>([
  'DISCOVERED_IN_FREELANCE_LIST',
  'INVITED_BY_PRODUCER',
  'FREELANCE_CONTACT',
  'REQUESTED_BY_REFERRER_LINK',
]);

function isReferrerInitiatedOrigin(origin: string): boolean {
  return REFERRER_INITIATED_ORIGINS.has(origin);
}

function isProducerInitiatedOrigin(origin: string): boolean {
  return PRODUCER_INITIATED_ORIGINS.has(origin);
}

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(
    tenantId: string,
    eventId: string,
    body: CreateReferralLinkBody,
  ): Promise<CreateReferralLinkResponse> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const existing = await this.prisma.referralLink.findUnique({
      where: { code: body.code },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Referral code already exists',
      });
    }

    const link = await this.prisma.referralLink.create({
      data: {
        tenantId,
        eventId,
        code: body.code,
        referrerId: body.referrerId ?? null,
        referrerProfileId: body.referrerProfileId ?? null,
        label: body.label ?? null,
      },
    });

    const url = referralCheckoutUrl(link.eventId, tenantId, link.code);

    return {
      id: link.id,
      code: link.code,
      eventId: link.eventId,
      label: link.label,
      url,
    };
  }

  async list(
    tenantId: string,
    eventId: string,
  ): Promise<{ links: ReferralLinkSummary[] }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const links = await this.prisma.referralLink.findMany({
      where: { eventId },
      include: {
        _count: { select: { attributions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      links: links.map((l) => ({
        id: l.id,
        code: l.code,
        label: l.label,
        attributedOrdersCount: l._count.attributions,
        createdAt: l.createdAt.toISOString(),
        referrerId: l.referrerId ?? null,
        referrerProfileId: l.referrerProfileId ?? null,
      })),
    };
  }

  async assignReferrersToEvent(
    tenantId: string,
    eventId: string,
    body: AssignReferralsBody,
  ): Promise<{ links: ReferralLinkSummary[] }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const currentLinks = await this.prisma.referralLink.findMany({
      where: { eventId },
      select: { id: true, referrerId: true },
    });

    const currentReferrerIds = new Set(
      currentLinks.filter((l) => l.referrerId).map((l) => l.referrerId!),
    );
    const targetIds = new Set(body.referrerIds);

    const toAdd = [...targetIds].filter((id) => !currentReferrerIds.has(id));
    const toRemove = currentLinks.filter(
      (l) => l.referrerId && !targetIds.has(l.referrerId),
    );

    const usedCodes = new Set(
      (await this.prisma.referralLink.findMany({ select: { code: true } })).map(
        (l) => l.code,
      ),
    );

    for (const link of toRemove) {
      await this.prisma.referralLink.delete({ where: { id: link.id } });
    }

    for (const referrerId of toAdd) {
      const user = await this.prisma.user.findFirst({
        where: { id: referrerId, tenantId, role: 'REFERRER', deletedAt: null },
      });
      if (!user) continue;

      let code = `ref-${referrerId.slice(-6)}-${eventId.slice(-6)}`;
      let suffix = 0;
      while (usedCodes.has(code)) {
        code = `ref-${crypto.randomBytes(4).toString('hex')}`;
        suffix++;
        if (suffix > 10) break;
      }
      usedCodes.add(code);

      await this.prisma.referralLink.create({
        data: {
          tenantId,
          eventId,
          code,
          referrerId,
          label: `${user.firstName} ${user.lastName}`.trim() || user.email,
        },
      });
    }

    return this.list(tenantId, eventId);
  }

  async listReferrers(tenantId: string): Promise<
    Array<{ id: string; email: string; firstName: string; lastName: string }>
  > {
    const users = await this.prisma.user.findMany({
      where: { tenantId, role: 'REFERRER', deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true },
      orderBy: { lastName: 'asc' },
    });
    return users;
  }

  // --- REFERRERS 2.0 NEW PATTERNS ---

  async getAssociatedReferrers(tenantId: string, producerProfileId: string) {
    return this.prisma.producerReferrerRelationship.findMany({
      where: { producerProfileId, referrerProfile: { tenantId } },
      include: {
        referrerProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Directorio freelance para productoras: búsqueda, filtros y orden sobre datos reales del perfil.
   * `relationship*` solo aplica si se pasa `producerProfileId`.
   */
  async getFreelanceReferrers(
    tenantId: string,
    producerProfileId: string | null,
    query: ProducerFreelanceReferrersQuery,
  ) {
    const q = (query.q ?? '').trim();
    const and: Prisma.ReferrerProfileWhereInput[] = [
      { tenantId, status: 'ACTIVE', publicVisibility: true },
    ];

    if (q.length > 0) {
      and.push({
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { publicHandle: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (query.activity === 'with_sales') {
      and.push({ completedSales: { gt: 0 } });
    }
    if (query.activity === 'no_sales') {
      and.push({ completedSales: 0 });
    }

    if (query.assignedEvents === 'with') {
      and.push({ eventAssignments: { some: { status: 'ACTIVE' } } });
    }
    if (query.assignedEvents === 'without') {
      and.push({ eventAssignments: { none: { status: 'ACTIVE' } } });
    }

    if (producerProfileId && query.relationship !== 'any') {
      switch (query.relationship) {
        case 'none':
          and.push({ producerRelationships: { none: { producerProfileId } } });
          break;
        case 'active':
          and.push({
            producerRelationships: { some: { producerProfileId, status: 'ACTIVE' } },
          });
          break;
        case 'pending':
          and.push({
            producerRelationships: { some: { producerProfileId, status: 'PENDING' } },
          });
          break;
        case 'closed':
          and.push({
            producerRelationships: {
              some: {
                producerProfileId,
                status: { in: ['REJECTED', 'BLOCKED'] },
              },
            },
          });
          break;
      }
    }

    let orderBy: Prisma.ReferrerProfileOrderByWithRelationInput[] = [
      { salesScore: 'desc' },
      { completedSales: 'desc' },
    ];
    switch (query.sort) {
      case 'recent':
        orderBy = [{ updatedAt: 'desc' }];
        break;
      case 'name_asc':
        orderBy = [{ displayName: 'asc' }];
        break;
      case 'name_desc':
        orderBy = [{ displayName: 'desc' }];
        break;
      case 'activity':
      case 'completed_sales':
        orderBy = [{ completedSales: 'desc' }, { salesScore: 'desc' }];
        break;
      case 'assigned_events':
        orderBy = [{ updatedAt: 'desc' }];
        break;
      default:
        break;
    }

    const includeRel = producerProfileId
      ? ({
          producerRelationships: {
            where: { producerProfileId },
            take: 1,
            select: { status: true },
          },
        } as const)
      : ({} as const);

    const rows = await this.prisma.referrerProfile.findMany({
      where: { AND: and },
      orderBy,
      take: query.limit,
      include: {
        _count: {
          select: {
            eventAssignments: { where: { status: 'ACTIVE' } },
          },
        },
        ...includeRel,
      },
    });

    let ordered = rows;
    if (query.sort === 'assigned_events') {
      ordered = [...rows].sort((a, b) => b._count.eventAssignments - a._count.eventAssignments);
    }

    type RowWithRel = (typeof ordered)[number] & {
      producerRelationships?: { status: string }[];
    };

    return ordered.map((row) => {
      const r = row as RowWithRel;
      const relStatus =
        producerProfileId && r.producerRelationships?.length
          ? r.producerRelationships[0]!.status
          : producerProfileId
            ? null
            : null;
      return {
        id: r.id,
        tenantId: r.tenantId,
        displayName: r.displayName,
        publicHandle: r.publicHandle,
        bio: r.bio,
        salesScore: r.salesScore,
        completedSales: r.completedSales,
        slug: r.slug,
        avatarUrl: r.avatarUrl,
        city: r.city,
        region: r.region,
        publicVisibility: r.publicVisibility,
        activeAssignedEventsCount: r._count.eventAssignments,
        relationshipStatusWithProducer: relStatus,
      };
    });
  }

  async associateProducerViaReferrerLink(
    tenantId: string,
    producerProfileId: string,
    token: string,
  ) {
    const referrer = await this.prisma.referrerProfile.findFirst({
      where: { tenantId, associationLinkToken: token, status: 'ACTIVE' },
    });
    if (!referrer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Invalid association link',
      });
    }

    const existing = await this.prisma.producerReferrerRelationship.findUnique({
      where: {
        producerProfileId_referrerProfileId: {
          producerProfileId,
          referrerProfileId: referrer.id,
        },
      },
      include: { referrerProfile: true },
    });
    if (existing) {
      if (existing.status === 'BLOCKED') {
        throw new ConflictException({
          code: ErrorCode.ASSOCIATION_BLOCKED,
          message: 'La relación con este referidor está bloqueada',
        });
      }
      if (existing.status === 'REJECTED') {
        const relationship = await this.prisma.producerReferrerRelationship.update({
          where: { id: existing.id },
          data: { status: 'PENDING', origin: 'REQUESTED_BY_REFERRER_LINK' },
          include: { referrerProfile: true },
        });
        return { relationship, created: false };
      }
      return { relationship: existing, created: false };
    }

    const relationship = await this.prisma.producerReferrerRelationship.create({
      data: {
        producerProfileId,
        referrerProfileId: referrer.id,
        status: 'PENDING',
        origin: 'REQUESTED_BY_REFERRER_LINK',
      },
      include: { referrerProfile: true },
    });
    return { relationship, created: true };
  }

  /**
   * Producer requests association from the public freelance/directory list.
   * Reuses existing row for the pair; never creates duplicates.
   */
  async requestAssociationFromFreelanceList(
    tenantId: string,
    producerProfileId: string,
    referrerProfileId: string,
  ) {
    const referrer = await this.prisma.referrerProfile.findFirst({
      where: {
        id: referrerProfileId,
        tenantId,
        status: 'ACTIVE',
        publicVisibility: true,
      },
    });
    if (!referrer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Referrer not found or not listed publicly',
      });
    }

    const existing = await this.prisma.producerReferrerRelationship.findUnique({
      where: {
        producerProfileId_referrerProfileId: {
          producerProfileId,
          referrerProfileId,
        },
      },
      include: { referrerProfile: true },
    });

    if (existing) {
      if (existing.status === 'BLOCKED') {
        throw new ConflictException({
          code: ErrorCode.ASSOCIATION_BLOCKED,
          message: 'La relación con este referidor está bloqueada',
        });
      }
      if (existing.status === 'REJECTED') {
        const relationship = await this.prisma.producerReferrerRelationship.update({
          where: { id: existing.id },
          data: { status: 'PENDING', origin: 'DISCOVERED_IN_FREELANCE_LIST' },
          include: { referrerProfile: true },
        });
        return { relationship, created: false };
      }
      return { relationship: existing, created: false };
    }

    const relationship = await this.prisma.producerReferrerRelationship.create({
      data: {
        producerProfileId,
        referrerProfileId,
        status: 'PENDING',
        origin: 'DISCOVERED_IN_FREELANCE_LIST',
      },
      include: { referrerProfile: true },
    });
    return { relationship, created: true };
  }

  private async activeReferrerProfileIdsForUser(tenantId: string, userId: string): Promise<string[]> {
    const rows = await this.prisma.userReferrerMembership.findMany({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
      select: { profileId: true },
    });
    return rows.map((r) => r.profileId);
  }

  /**
   * Referidor: listar relaciones con productoras (misma fila única por par).
   */
  async listProducerRelationshipsForReferrerUser(tenantId: string, userId: string) {
    const profileIds = await this.activeReferrerProfileIdsForUser(tenantId, userId);
    if (profileIds.length === 0) return [];
    return this.prisma.producerReferrerRelationship.findMany({
      where: {
        referrerProfileId: { in: profileIds },
        producerProfile: { tenantId },
      },
      include: { producerProfile: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Referidor: responder solicitud pendiente iniciada por la productora (directorio, invitación, etc.).
   */
  async transitionAssociationAsReferrer(
    tenantId: string,
    userId: string,
    producerProfileId: string,
    targetStatus: 'ACTIVE' | 'REJECTED',
    notes?: string,
  ) {
    const profileIds = await this.activeReferrerProfileIdsForUser(tenantId, userId);
    if (profileIds.length === 0) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No hay perfil de referidor activo',
      });
    }
    const producer = await this.prisma.producerProfile.findFirst({
      where: { id: producerProfileId, tenantId },
    });
    if (!producer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Productora no encontrada',
      });
    }
    const existing = await this.prisma.producerReferrerRelationship.findFirst({
      where: { producerProfileId, referrerProfileId: { in: profileIds } },
      include: { producerProfile: true, referrerProfile: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No hay relación con esta productora',
      });
    }
    if (existing.status === targetStatus) {
      return existing;
    }
    if (existing.status === 'BLOCKED') {
      throw new ConflictException({
        code: ErrorCode.ASSOCIATION_BLOCKED,
        message: 'La relación está bloqueada',
      });
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException({
        code: ErrorCode.ASSOCIATION_INVALID_TRANSITION,
        message: 'Solo podés responder solicitudes pendientes',
      });
    }
    if (isReferrerInitiatedOrigin(existing.origin)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Esta solicitud la gestiona la productora',
      });
    }
    if (!isProducerInitiatedOrigin(existing.origin)) {
      throw new BadRequestException({
        code: ErrorCode.ASSOCIATION_INVALID_TRANSITION,
        message: 'No podés responder esta solicitud',
      });
    }
    return this.prisma.producerReferrerRelationship.update({
      where: { id: existing.id },
      data: { status: targetStatus, notes: notes ?? existing.notes },
      include: { producerProfile: true, referrerProfile: true },
    });
  }

  /**
   * Productora: transiciones válidas según estado y origen. No crea filas: la relación debe existir.
   */
  async setAssociationStatus(
    producerProfileId: string,
    referrerProfileId: string,
    targetStatus: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'BLOCKED',
    notes?: string,
  ) {
    const relInclude = { referrerProfile: true } as const;
    const existing = await this.prisma.producerReferrerRelationship.findUnique({
      where: {
        producerProfileId_referrerProfileId: { producerProfileId, referrerProfileId },
      },
      include: relInclude,
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No existe relación con este referidor',
      });
    }

    if (targetStatus === 'PENDING') {
      throw new BadRequestException({
        code: ErrorCode.ASSOCIATION_INVALID_TRANSITION,
        message: 'No podés establecer manualmente el estado pendiente; usá el directorio o el link del referidor',
      });
    }

    if (existing.status === targetStatus) {
      return existing;
    }

    const { status: from, origin } = existing;

    if (from === 'BLOCKED') {
      throw new ConflictException({
        code: ErrorCode.ASSOCIATION_BLOCKED,
        message: 'La relación está bloqueada; no se reabre automáticamente',
      });
    }

    if (from === 'REJECTED') {
      throw new ConflictException({
        code: ErrorCode.ASSOCIATION_INVALID_TRANSITION,
        message:
          'La relación fue rechazada. Volvé a solicitarla desde el directorio o el link personal del referidor',
      });
    }

    if (from === 'ACTIVE') {
      if (targetStatus !== 'BLOCKED') {
        throw new BadRequestException({
          code: ErrorCode.ASSOCIATION_INVALID_TRANSITION,
          message: 'Una relación activa solo puede pasar a bloqueada',
        });
      }
      return this.prisma.producerReferrerRelationship.update({
        where: { id: existing.id },
        data: { status: 'BLOCKED', notes: notes ?? existing.notes },
        include: relInclude,
      });
    }

    if (from === 'PENDING') {
      if (isReferrerInitiatedOrigin(origin)) {
        if (targetStatus === 'ACTIVE' || targetStatus === 'REJECTED') {
          return this.prisma.producerReferrerRelationship.update({
            where: { id: existing.id },
            data: { status: targetStatus, notes: notes ?? existing.notes },
            include: relInclude,
          });
        }
        throw new BadRequestException({
          code: ErrorCode.ASSOCIATION_INVALID_TRANSITION,
          message: 'Desde una solicitud del referidor solo podés aceptar o rechazar',
        });
      }
      if (isProducerInitiatedOrigin(origin)) {
        if (targetStatus === 'REJECTED') {
          return this.prisma.producerReferrerRelationship.update({
            where: { id: existing.id },
            data: { status: 'REJECTED', notes: notes ?? existing.notes },
            include: relInclude,
          });
        }
        throw new BadRequestException({
          code: ErrorCode.ASSOCIATION_INVALID_TRANSITION,
          message: 'Esta solicitud la inició tu productora; el referidor debe aceptarla o rechazarla',
        });
      }
      if (targetStatus === 'REJECTED') {
        return this.prisma.producerReferrerRelationship.update({
          where: { id: existing.id },
          data: { status: 'REJECTED', notes: notes ?? existing.notes },
          include: relInclude,
        });
      }
      throw new BadRequestException({
        code: ErrorCode.ASSOCIATION_INVALID_TRANSITION,
        message: 'Transición no permitida para el origen de esta solicitud',
      });
    }

    throw new BadRequestException({
      code: ErrorCode.ASSOCIATION_INVALID_TRANSITION,
      message: 'Estado de relación no soportado',
    });
  }

  private formatAssignReferrerToEventResponse(
    tenantId: string,
    row: {
      id: string;
      eventId: string;
      referrerProfileId: string;
      status: string;
      courtesyQuota: number;
      courtesyUsedCount: number;
      createdAt: Date;
      updatedAt: Date;
      referralLink: { id: string; code: string; label: string | null } | null;
    },
    alreadyAssigned: boolean,
  ): AssignReferrerToEventResponse {
    if (!row.referralLink) {
      throw new BadRequestException({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Asignación sin link de venta',
      });
    }
    return {
      assignment: {
        id: row.id,
        eventId: row.eventId,
        referrerProfileId: row.referrerProfileId,
        status: row.status as 'ACTIVE' | 'PAUSED' | 'CANCELED',
        courtesyQuota: row.courtesyQuota,
        courtesyUsedCount: row.courtesyUsedCount,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
      referralLink: {
        id: row.referralLink.id,
        code: row.referralLink.code,
        url: referralCheckoutUrl(row.eventId, tenantId, row.referralLink.code),
        label: row.referralLink.label,
      },
      alreadyAssigned,
    };
  }

  private async createReferralLinkForAssignment(
    tenantId: string,
    eventId: string,
    referrerProfileId: string,
    displayName: string,
  ) {
    let code = `ref-${referrerProfileId.slice(-6)}-${eventId.slice(-6)}`;
    let suffix = 0;
    while (true) {
      const existingCode = await this.prisma.referralLink.findUnique({ where: { code } });
      if (!existingCode) break;
      code = `ref-${crypto.randomBytes(4).toString('hex')}`;
      suffix++;
      if (suffix > 10) break;
    }
    return this.prisma.referralLink.create({
      data: {
        tenantId,
        eventId,
        code,
        referrerProfileId,
        label: displayName,
      },
    });
  }

  /**
   * Asignación comercial a evento: requiere evento propio + relación general ACTIVE + perfil referidor ACTIVE.
   * Idempotente para el par evento/referidor (una fila @@unique); no duplica links ni asignaciones activas.
   */
  async createEventAssignment(
    tenantId: string,
    eventId: string,
    producerProfileId: string,
    referrerProfileId: string,
    courtesyQuota: number,
  ): Promise<AssignReferrerToEventResponse> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, producerProfileId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Evento no encontrado o no pertenece a tu productora',
      });
    }

    const relationship = await this.prisma.producerReferrerRelationship.findUnique({
      where: {
        producerProfileId_referrerProfileId: { producerProfileId, referrerProfileId },
      },
    });
    if (!relationship || relationship.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: ErrorCode.ASSOCIATION_NOT_ACTIVE,
        message:
          'Solo podés asignar referidos con relación general activa (Asociado). No alcanza con estar pendiente o inactivo.',
      });
    }

    const referrer = await this.prisma.referrerProfile.findFirst({
      where: { id: referrerProfileId, tenantId, status: 'ACTIVE' },
    });
    if (!referrer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Referidor no encontrado o sin perfil activo',
      });
    }

    const existing = await this.prisma.eventReferrerAssignment.findUnique({
      where: {
        eventId_producerProfileId_referrerProfileId: {
          eventId,
          producerProfileId,
          referrerProfileId,
        },
      },
      include: { referralLink: true },
    });

    if (existing) {
      if (existing.status === 'CANCELED') {
        let link = existing.referralLink;
        let referralLinkId = existing.referralLinkId;
        if (!link || !referralLinkId) {
          const created = await this.createReferralLinkForAssignment(
            tenantId,
            eventId,
            referrerProfileId,
            referrer.displayName,
          );
          link = created;
          referralLinkId = created.id;
        }
        const updated = await this.prisma.eventReferrerAssignment.update({
          where: { id: existing.id },
          data: {
            status: 'ACTIVE',
            courtesyQuota,
            salesScoreSnapshot: referrer.salesScore,
            referralLinkId,
          },
          include: { referralLink: true },
        });
        return this.formatAssignReferrerToEventResponse(tenantId, updated, false);
      }

      const updated = await this.prisma.eventReferrerAssignment.update({
        where: { id: existing.id },
        data: { courtesyQuota },
        include: { referralLink: true },
      });
      return this.formatAssignReferrerToEventResponse(tenantId, updated, true);
    }

    const referralLink = await this.createReferralLinkForAssignment(
      tenantId,
      eventId,
      referrerProfileId,
      referrer.displayName,
    );

    const assignment = await this.prisma.eventReferrerAssignment.create({
      data: {
        eventId,
        producerProfileId,
        referrerProfileId,
        referralLinkId: referralLink.id,
        courtesyQuota,
        salesScoreSnapshot: referrer.salesScore,
        status: 'ACTIVE',
      },
      include: { referralLink: true },
    });

    return this.formatAssignReferrerToEventResponse(tenantId, assignment, false);
  }

  async listEventAssignmentsForProducer(
    tenantId: string,
    eventId: string,
    producerProfileId: string,
  ): Promise<ProducerEventAssignmentsResponse> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, producerProfileId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Evento no encontrado o no pertenece a tu productora',
      });
    }

    const rows = await this.prisma.eventReferrerAssignment.findMany({
      where: { eventId, producerProfileId },
      include: {
        referrerProfile: {
          select: {
            id: true,
            displayName: true,
            publicHandle: true,
            salesScore: true,
            completedSales: true,
          },
        },
        referralLink: { include: { _count: { select: { attributions: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      assignments: rows.map((a) => ({
        assignment: {
          id: a.id,
          eventId: a.eventId,
          referrerProfileId: a.referrerProfileId,
          status: a.status,
          courtesyQuota: a.courtesyQuota,
          courtesyUsedCount: a.courtesyUsedCount,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        },
        referrerProfile: a.referrerProfile,
        referralLink: a.referralLink
          ? {
              id: a.referralLink.id,
              code: a.referralLink.code,
              url: referralCheckoutUrl(a.eventId, tenantId, a.referralLink.code),
              label: a.referralLink.label,
              attributedOrdersCount: a.referralLink._count.attributions,
            }
          : null,
      })),
    };
  }

  async lookupByCode(code: string): Promise<{ eventId: string; tenantId: string } | null> {
    const link = await this.prisma.referralLink.findUnique({
      where: { code },
      select: { eventId: true, tenantId: true },
    });
    return link ? { eventId: link.eventId, tenantId: link.tenantId } : null;
  }

  async listByReferrer(tenantId: string, userId: string): Promise<{ links: (ReferralLinkSummary & { eventId?: string })[] }> {
    const profileIds = await this.prisma.userReferrerMembership.findMany({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
      select: { profileId: true },
    }).then((r) => r.map((m) => m.profileId));
    const links = await this.prisma.referralLink.findMany({
      where: {
        tenantId,
        OR: [
          { referrerId: userId },
          ...(profileIds.length ? [{ referrerProfileId: { in: profileIds } }] : []),
        ],
      },
      include: {
        _count: { select: { attributions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      links: links.map((l) => ({
        id: l.id,
        code: l.code,
        label: l.label,
        attributedOrdersCount: l._count.attributions,
        createdAt: l.createdAt.toISOString(),
        eventId: l.eventId,
        referrerProfileId: l.referrerProfileId ?? null,
      })),
    };
  }

  async listCommissionsByUser(userId: string): Promise<ReferralCommission[]> {
    const items = await this.prisma.referralCommission.findMany({
      where: { referrerId: userId },
      orderBy: { requestedAt: 'desc' },
    });
    return items.map((c) => ({
      id: c.id,
      referrerId: c.referrerId,
      referralLinkId: c.referralLinkId,
      eventId: c.eventId,
      amountCents: c.amountCents,
      status: c.status,
      requestedAt: c.requestedAt?.toISOString() ?? null,
      paidAt: c.paidAt?.toISOString() ?? null,
      confirmedByUserId: c.confirmedByUserId,
    }));
  }

  async requestCommission(
    tenantId: string,
    userId: string,
    referralLinkId: string,
  ): Promise<ReferralCommission> {
    const profileIds = await this.prisma.userReferrerMembership.findMany({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
      select: { profileId: true },
    }).then((r) => r.map((m) => m.profileId));
    const link = await this.prisma.referralLink.findFirst({
      where: {
        id: referralLinkId,
        tenantId,
        OR: [
          { referrerId: userId },
          ...(profileIds.length ? [{ referrerProfileId: { in: profileIds } }] : []),
        ],
      },
      include: { _count: { select: { attributions: true } } },
    });
    if (!link) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Referral link not found or not yours',
      });
    }
    const amountCents = link._count.attributions * 5000; // demo: 50 per order
    if (amountCents <= 0) {
      throw new ConflictException({
        code: 'BAD_REQUEST',
        message: 'No attributed orders to claim',
      });
    }
    const existing = await this.prisma.referralCommission.findFirst({
      where: { referralLinkId },
    });
    if (existing) {
      if (existing.status === 'REQUESTED' || existing.status === 'PAID') {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          message: 'Commission already requested or paid',
        });
      }
      const updated = await this.prisma.referralCommission.update({
        where: { id: existing.id },
        data: { status: 'REQUESTED', requestedAt: new Date(), amountCents },
      });
      return {
        id: updated.id,
        referrerId: updated.referrerId,
        referralLinkId: updated.referralLinkId,
        eventId: updated.eventId,
        amountCents: updated.amountCents,
        status: updated.status,
        requestedAt: updated.requestedAt?.toISOString() ?? null,
        paidAt: updated.paidAt?.toISOString() ?? null,
        confirmedByUserId: updated.confirmedByUserId,
      };
    }
    const created = await this.prisma.referralCommission.create({
      data: {
        tenantId,
        referrerId: userId,
        referralLinkId,
        eventId: link.eventId,
        amountCents,
        status: 'REQUESTED',
        requestedAt: new Date(),
      },
    });
    return {
      id: created.id,
      referrerId: created.referrerId,
      referralLinkId: created.referralLinkId,
      eventId: created.eventId,
      amountCents: created.amountCents,
      status: created.status,
      requestedAt: created.requestedAt?.toISOString() ?? null,
      paidAt: created.paidAt?.toISOString() ?? null,
      confirmedByUserId: created.confirmedByUserId,
    };
  }

  async listCommissionRequestsForEvent(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
  ): Promise<ReferralCommission[]> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { producerId: true },
    });
    if (!event) throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    const isAdmin = userRole === 'ADMIN';
    const isProducer = event.producerId === userId;
    if (!isAdmin && !isProducer) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });
    }
    const items = await this.prisma.referralCommission.findMany({
      where: { eventId, status: 'REQUESTED' },
      orderBy: { requestedAt: 'asc' },
    });
    return items.map((c) => ({
      id: c.id,
      referrerId: c.referrerId,
      referralLinkId: c.referralLinkId,
      eventId: c.eventId,
      amountCents: c.amountCents,
      status: c.status,
      requestedAt: c.requestedAt?.toISOString() ?? null,
      paidAt: c.paidAt?.toISOString() ?? null,
      confirmedByUserId: c.confirmedByUserId,
    }));
  }

  async confirmCommissionPayout(
    tenantId: string,
    commissionId: string,
    adminUserId: string,
  ): Promise<ReferralCommission | null> {
    const commission = await this.prisma.referralCommission.findFirst({
      where: { id: commissionId, tenantId, status: 'REQUESTED' },
    });
    if (!commission) return null;
    const updated = await this.prisma.referralCommission.update({
      where: { id: commissionId },
      data: { status: 'PAID', paidAt: new Date(), confirmedByUserId: adminUserId },
    });
    return {
      id: updated.id,
      referrerId: updated.referrerId,
      referralLinkId: updated.referralLinkId,
      eventId: updated.eventId,
      amountCents: updated.amountCents,
      status: updated.status,
      requestedAt: updated.requestedAt?.toISOString() ?? null,
      paidAt: updated.paidAt?.toISOString() ?? null,
      confirmedByUserId: updated.confirmedByUserId,
    };
  }
}
