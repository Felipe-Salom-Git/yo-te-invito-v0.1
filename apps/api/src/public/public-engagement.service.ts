import { Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../common/profiles-authorization.service';
import { mergePublicEventVisibility } from '../common/utils/event-public-visibility.util';
import { ErrorCode } from '@yo-te-invito/shared';

type OptionalViewer = { id: string; tenantId: string; role: string } | undefined;

@Injectable()
export class PublicEngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesAuth: ProfilesAuthorizationService,
  ) {}

  async recordEventView(
    tenantId: string,
    eventId: string,
    viewer?: OptionalViewer,
  ): Promise<{ recorded: boolean }> {
    const event = await this.prisma.event.findFirst({
      where: mergePublicEventVisibility({
        id: eventId,
        tenantId,
        deletedAt: null,
        status: EventStatus.APPROVED,
      }),
      select: {
        id: true,
        producerId: true,
        producerProfileId: true,
      },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.EVENT_NOT_FOUND,
        message: 'Event not found',
      });
    }

    if (await this.shouldSkipEventView(tenantId, event, viewer)) {
      return { recorded: false };
    }

    await this.prisma.event.update({
      where: { id: event.id },
      data: { viewCount: { increment: 1 } },
    });

    return { recorded: true };
  }

  async recordProducerProfileView(
    tenantId: string,
    idOrSlug: string,
    viewer?: OptionalViewer,
  ): Promise<{ recorded: boolean }> {
    const profile = await this.prisma.producerProfile.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Producer not found',
      });
    }

    if (viewer) {
      if (viewer.role === Role.ADMIN) {
        return { recorded: false };
      }
      const canManage = await this.profilesAuth.canManageProducerProfile(
        tenantId,
        viewer.id,
        profile.id,
      );
      if (canManage) {
        return { recorded: false };
      }
    }

    await this.prisma.producerProfile.update({
      where: { id: profile.id },
      data: { viewCount: { increment: 1 } },
    });

    return { recorded: true };
  }

  private async shouldSkipEventView(
    tenantId: string,
    event: { producerId: string; producerProfileId: string | null },
    viewer?: OptionalViewer,
  ): Promise<boolean> {
    if (!viewer) return false;
    if (viewer.role === Role.ADMIN) return true;
    return this.profilesAuth.canManageEvent(tenantId, viewer.id, event);
  }
}
