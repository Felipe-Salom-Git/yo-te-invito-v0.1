import { Injectable } from '@nestjs/common';
import {
  EventPublic,
  EventStatus,
  EventsListQuery,
  EventsPaginatedResponse,
} from '@yo-te-invito/shared';

/**
 * Public events service — stub data for V1 bootstrap
 * Service público de eventos — datos stub para bootstrap V1
 * TODO: Replace with Prisma when full schema + migrations are in place
 */
@Injectable()
export class PublicEventsService {
  async list(query: EventsListQuery): Promise<EventsPaginatedResponse> {
    const stubEvents: EventPublic[] = [
      {
        id: 'evt-stub-1',
        title: 'Sample Event One',
        description: 'First stub event for smoke testing.',
        startAt: '2025-06-15T20:00:00.000Z',
        endAt: '2025-06-16T02:00:00.000Z',
        city: 'Buenos Aires',
        venueName: 'Teatro Gran Rex',
        venueAddress: 'Av. Corrientes 857',
        status: EventStatus.APPROVED,
        coverImageUrl: null,
        isTicketingEnabled: true,
      },
      {
        id: 'evt-stub-2',
        title: 'Sample Event Two',
        description: 'Second stub event.',
        startAt: '2025-07-01T21:00:00.000Z',
        endAt: '2025-07-02T01:00:00.000Z',
        city: 'Córdoba',
        venueName: 'Orfeo Superdomo',
        venueAddress: null,
        status: EventStatus.APPROVED,
        coverImageUrl: null,
        isTicketingEnabled: true,
      },
    ];

    const start = (query.page - 1) * query.limit;
    const sliced = stubEvents.slice(start, start + query.limit);
    const total = stubEvents.length;

    return {
      data: sliced,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }
}
