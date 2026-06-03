import { Injectable } from '@nestjs/common';
import { ProfileStatus, type GastroProfile } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { readGastroGallery } from './gastro-profile-fields.util';

@Injectable()
export class GastroPublicEventSyncService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates or updates the public discovery Event linked to a gastro profile.
   * Keeps gallery in EventMedia when galleryUrls is provided.
   */
  async syncPublicEvent(
    profile: GastroProfile,
    actorUserId: string,
    galleryUrls: string[] | null | undefined,
  ): Promise<string> {
    const now = new Date();
    const eventData = {
      tenantId: profile.tenantId,
      producerId: actorUserId,
      category: 'gastro',
      subcategoryId: profile.subcategoryId,
      title: profile.displayName,
      summary: profile.summary,
      description: profile.detail ?? profile.description,
      startAt: now,
      endAt: null as Date | null,
      city: profile.city,
      province: profile.province,
      venueName: profile.displayName,
      venueAddress: profile.address,
      googlePlaceId: profile.googlePlaceId,
      geoLat: profile.geoLat,
      geoLng: profile.geoLng,
      coverImageUrl: profile.bannerUrl,
      status: this.eventStatusForProfile(profile.status),
      isTicketingEnabled: false,
      publishedAt: profile.status === 'ACTIVE' ? now : null,
    };

    let eventId = profile.publicEventId;
    if (eventId) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: eventData,
      });
    } else {
      const created = await this.prisma.event.create({ data: eventData });
      eventId = created.id;
      await this.prisma.gastroProfile.update({
        where: { id: profile.id },
        data: { publicEventId: eventId },
      });
    }

    if (galleryUrls !== undefined) {
      await this.prisma.eventMedia.updateMany({
        where: { eventId, deletedAt: null },
        data: { deletedAt: now },
      });
      if (galleryUrls && galleryUrls.length > 0) {
        await this.prisma.eventMedia.createMany({
          data: galleryUrls.map((url, i) => ({
            eventId,
            type: 'IMAGE',
            url,
            sortOrder: i,
          })),
        });
      }
    }

    return eventId;
  }

  /** Hides or restores the linked event in discovery without clearing publicEventId. */
  async syncVisibilityForProfile(profile: GastroProfile): Promise<void> {
    if (!profile.publicEventId) return;
    await this.prisma.event.update({
      where: { id: profile.publicEventId },
      data: {
        status: this.eventStatusForProfile(profile.status),
        publishedAt: profile.status === 'ACTIVE' ? new Date() : null,
      },
    });
  }

  private eventStatusForProfile(status: ProfileStatus): 'APPROVED' | 'PAUSED' {
    return status === 'ACTIVE' ? 'APPROVED' : 'PAUSED';
  }

  readGallery(profile: GastroProfile): string[] | null {
    return readGastroGallery(profile);
  }
}
