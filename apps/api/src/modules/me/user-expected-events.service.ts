import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { readPortalPreferences } from './user-portal-preferences.util';
import type {
  CreateUserExpectedEventBody,
  MeExpectedEventsResponse,
  PatchUserExpectedEventNotifications,
  UserExpectedEvent,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class UserExpectedEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, userId: string): Promise<MeExpectedEventsResponse> {
    const rows = await this.prisma.userExpectedEvent.findMany({
      where: { tenantId, userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
            category: true,
            coverImageUrl: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      expectedEvents: rows
        .filter((r) => r.event)
        .map((r) => ({
          id: r.id,
          eventId: r.eventId,
          webNotificationsEnabled: r.webNotificationsEnabled,
          emailNotificationsEnabled: r.emailNotificationsEnabled,
          createdAt: r.createdAt.toISOString(),
          event: {
            id: r.event.id,
            title: r.event.title,
            startAt: r.event.startAt.toISOString(),
            category: r.event.category ?? 'event',
            coverImageUrl: r.event.coverImageUrl,
          },
        })),
    };
  }

  async create(
    tenantId: string,
    userId: string,
    body: CreateUserExpectedEventBody,
  ): Promise<UserExpectedEvent> {
    if (body.tenantId !== tenantId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'tenantId mismatch',
      });
    }

    const event = await this.prisma.event.findFirst({
      where: { id: body.eventId, tenantId, deletedAt: null },
      select: {
        id: true,
        title: true,
        startAt: true,
        category: true,
        coverImageUrl: true,
      },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { preferences: true },
    });
    const portalPrefs = readPortalPreferences(userId, user?.preferences ?? null);

    try {
      const row = await this.prisma.userExpectedEvent.create({
        data: {
          tenantId,
          userId,
          eventId: body.eventId,
          webNotificationsEnabled: body.webNotificationsEnabled ?? true,
          emailNotificationsEnabled:
            body.emailNotificationsEnabled ?? portalPrefs.emailNotificationsEnabled,
        },
      });
      return {
        id: row.id,
        eventId: row.eventId,
        webNotificationsEnabled: row.webNotificationsEnabled,
        emailNotificationsEnabled: row.emailNotificationsEnabled,
        createdAt: row.createdAt.toISOString(),
        event: {
          id: event.id,
          title: event.title,
          startAt: event.startAt.toISOString(),
          category: event.category ?? 'event',
          coverImageUrl: event.coverImageUrl,
        },
      };
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          message: 'Already following this event',
        });
      }
      throw e;
    }
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const result = await this.prisma.userExpectedEvent.deleteMany({
      where: { id, tenantId, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Expected event not found',
      });
    }
  }

  async patchNotifications(
    tenantId: string,
    userId: string,
    id: string,
    patch: PatchUserExpectedEventNotifications,
  ): Promise<UserExpectedEvent> {
    const row = await this.prisma.userExpectedEvent.findFirst({
      where: { id, tenantId, userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
            category: true,
            coverImageUrl: true,
          },
        },
      },
    });
    if (!row?.event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Expected event not found',
      });
    }
    const updated = await this.prisma.userExpectedEvent.update({
      where: { id },
      data: {
        webNotificationsEnabled:
          patch.webNotificationsEnabled ?? row.webNotificationsEnabled,
        emailNotificationsEnabled:
          patch.emailNotificationsEnabled ?? row.emailNotificationsEnabled,
      },
    });
    return {
      id: updated.id,
      eventId: updated.eventId,
      webNotificationsEnabled: updated.webNotificationsEnabled,
      emailNotificationsEnabled: updated.emailNotificationsEnabled,
      createdAt: updated.createdAt.toISOString(),
      event: {
        id: row.event.id,
        title: row.event.title,
        startAt: row.event.startAt.toISOString(),
        category: row.event.category ?? 'event',
        coverImageUrl: row.event.coverImageUrl,
      },
    };
  }
}
