import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { EventOccurrence, Prisma } from '@prisma/client';
import {
  ErrorCode,
  deriveEventStartAtFromOccurrences,
  type CreateEventOccurrenceBody,
  type EventOccurrenceResponse,
  type EventOccurrencesListQuery,
  type UpdateEventOccurrenceBody,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventOccurrencesService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(row: EventOccurrence): EventOccurrenceResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      eventId: row.eventId,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt?.toISOString() ?? null,
      venueName: row.venueName,
      venueAddress: row.venueAddress,
      city: row.city,
      province: row.province,
      googlePlaceId: row.googlePlaceId,
      geoLat: row.geoLat,
      geoLng: row.geoLng,
      capacity: row.capacity,
      status: row.status,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async assertEventInTenant(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true, tenantId: true },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    return event;
  }

  private async assertOccurrenceInTenant(
    tenantId: string,
    eventId: string,
    occurrenceId: string,
  ): Promise<EventOccurrence> {
    const row = await this.prisma.eventOccurrence.findFirst({
      where: { id: occurrenceId, eventId, tenantId },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event occurrence not found',
      });
    }
    return row;
  }

  async listForEvent(
    tenantId: string,
    eventId: string,
    query: EventOccurrencesListQuery = {},
  ): Promise<EventOccurrenceResponse[]> {
    await this.assertEventInTenant(tenantId, eventId);

    const where: Prisma.EventOccurrenceWhereInput = {
      tenantId,
      eventId,
    };
    if (!query.includeCancelled) {
      where.status = { not: 'CANCELLED' };
    }

    const rows = await this.prisma.eventOccurrence.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { startAt: 'asc' }],
    });
    return rows.map((row) => this.toResponse(row));
  }

  async createForEvent(
    tenantId: string,
    eventId: string,
    body: CreateEventOccurrenceBody,
  ): Promise<EventOccurrenceResponse> {
    const event = await this.assertEventInTenant(tenantId, eventId);

    let sortOrder = body.sortOrder;
    if (sortOrder == null) {
      const max = await this.prisma.eventOccurrence.aggregate({
        where: { eventId },
        _max: { sortOrder: true },
      });
      sortOrder = (max._max.sortOrder ?? -1) + 1;
    }

    const row = await this.prisma.eventOccurrence.create({
      data: {
        tenantId: event.tenantId,
        eventId,
        startAt: new Date(body.startAt),
        endAt: body.endAt ? new Date(body.endAt) : null,
        venueName: body.venueName ?? null,
        venueAddress: body.venueAddress ?? null,
        city: body.city ?? null,
        province: body.province ?? null,
        googlePlaceId: body.googlePlaceId ?? null,
        geoLat: body.geoLat ?? null,
        geoLng: body.geoLng ?? null,
        capacity: body.capacity ?? null,
        status: body.status ?? 'ACTIVE',
        sortOrder,
      },
    });

    await this.syncEventStartAt(tenantId, eventId);
    return this.toResponse(row);
  }

  async updateOccurrence(
    tenantId: string,
    eventId: string,
    occurrenceId: string,
    body: UpdateEventOccurrenceBody,
  ): Promise<EventOccurrenceResponse> {
    await this.assertOccurrenceInTenant(tenantId, eventId, occurrenceId);

    const row = await this.prisma.eventOccurrence.update({
      where: { id: occurrenceId },
      data: {
        ...(body.startAt != null ? { startAt: new Date(body.startAt) } : {}),
        ...(body.endAt !== undefined
          ? { endAt: body.endAt ? new Date(body.endAt) : null }
          : {}),
        ...(body.venueName !== undefined ? { venueName: body.venueName } : {}),
        ...(body.venueAddress !== undefined ? { venueAddress: body.venueAddress } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.province !== undefined ? { province: body.province } : {}),
        ...(body.googlePlaceId !== undefined ? { googlePlaceId: body.googlePlaceId } : {}),
        ...(body.geoLat !== undefined ? { geoLat: body.geoLat } : {}),
        ...(body.geoLng !== undefined ? { geoLng: body.geoLng } : {}),
        ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
        ...(body.status != null ? { status: body.status } : {}),
        ...(body.sortOrder != null ? { sortOrder: body.sortOrder } : {}),
      },
    });

    await this.syncEventStartAt(tenantId, eventId);
    return this.toResponse(row);
  }

  /** Keep Event.startAt aligned with next visible occurrence for discovery/cards. */
  async syncEventStartAt(tenantId: string, eventId: string): Promise<void> {
    const rows = await this.prisma.eventOccurrence.findMany({
      where: { tenantId, eventId, status: { not: 'CANCELLED' } },
      orderBy: [{ sortOrder: 'asc' }, { startAt: 'asc' }],
    });
    if (rows.length === 0) return;

    const nextStart = deriveEventStartAtFromOccurrences(rows);
    if (!nextStart) return;

    await this.prisma.event.update({
      where: { id: eventId },
      data: { startAt: nextStart },
    });
  }

  async deleteOccurrence(
    tenantId: string,
    eventId: string,
    occurrenceId: string,
  ): Promise<void> {
    await this.assertOccurrenceInTenant(tenantId, eventId, occurrenceId);

    const soldTickets = await this.prisma.ticket.count({
      where: {
        eventId,
        ticketType: { occurrenceId },
      },
    });
    if (soldTickets > 0) {
      throw new BadRequestException({
        code: ErrorCode.CONFLICT,
        message: 'Cannot remove a date that already has sold tickets',
      });
    }

    await this.prisma.ticketType.updateMany({
      where: { occurrenceId, eventId },
      data: { occurrenceId: null },
    });

    await this.prisma.eventOccurrence.delete({ where: { id: occurrenceId } });
    await this.syncEventStartAt(tenantId, eventId);
  }

  async countForEvent(tenantId: string, eventId: string): Promise<number> {
    return this.prisma.eventOccurrence.count({
      where: { tenantId, eventId, status: { not: 'CANCELLED' } },
    });
  }

  async getOccurrenceWithStats(
    tenantId: string,
    eventId: string,
  ): Promise<
    Array<
      EventOccurrenceResponse & {
        ticketTypeCount: number;
        soldCount: number;
        capacityAvailable: number;
      }
    >
  > {
    const rows = await this.listForEvent(tenantId, eventId, { includeCancelled: true });
    const enriched = await Promise.all(
      rows.map(async (occ) => {
        const types = await this.prisma.ticketType.findMany({
          where: { eventId, occurrenceId: occ.id, deletedAt: null },
          select: { capacityAvailable: true },
        });
        const soldCount = await this.prisma.ticket.count({
          where: { eventId, ticketType: { occurrenceId: occ.id } },
        });
        return {
          ...occ,
          ticketTypeCount: types.length,
          soldCount,
          capacityAvailable: types.reduce((s, t) => s + t.capacityAvailable, 0),
        };
      }),
    );
    return enriched;
  }

  /** Reject cross-tenant or cross-event ticket type ↔ occurrence pairing. */
  async assertTicketTypeMatchesOccurrence(
    tenantId: string,
    eventId: string,
    ticketTypeId: string,
    occurrenceId: string,
  ): Promise<void> {
    const [ticketType, occurrence] = await Promise.all([
      this.prisma.ticketType.findFirst({
        where: { id: ticketTypeId, tenantId, eventId, deletedAt: null },
        select: { id: true, occurrenceId: true },
      }),
      this.prisma.eventOccurrence.findFirst({
        where: { id: occurrenceId, tenantId, eventId },
        select: { id: true },
      }),
    ]);

    if (!ticketType) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Ticket type not found',
      });
    }
    if (!occurrence) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event occurrence not found',
      });
    }
    if (ticketType.occurrenceId != null && ticketType.occurrenceId !== occurrenceId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Ticket type belongs to a different event date',
      });
    }
  }

  /** Guard: occurrence must belong to the same tenant as the caller context. */
  assertTenantMatch(expectedTenantId: string, actualTenantId: string): void {
    if (expectedTenantId !== actualTenantId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Occurrence does not belong to this tenant',
      });
    }
  }
}
