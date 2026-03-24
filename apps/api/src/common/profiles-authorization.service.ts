/**
 * Authorization helpers for operational profiles.
 * Supports hybrid checks: membership OR legacy role during migration.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user has access to manage producer profile (via membership or legacy role).
   */
  async canManageProducerProfile(
    tenantId: string,
    userId: string,
    producerProfileId: string | null,
  ): Promise<boolean> {
    if (!producerProfileId) return false;

    const membership = await this.prisma.userProducerMembership.findFirst({
      where: {
        tenantId,
        userId,
        profileId: producerProfileId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE' },
      },
    });
    if (membership) return true;

    const profile = await this.prisma.producerProfile.findFirst({
      where: { id: producerProfileId, tenantId },
      select: { createdByUserId: true },
    });
    return profile?.createdByUserId === userId;
  }

  /**
   * Check if user can manage event (owns via producerProfileId or legacy producerId).
   */
  async canManageEvent(
    tenantId: string,
    userId: string,
    event: { producerId: string; producerProfileId: string | null },
  ): Promise<boolean> {
    if (event.producerProfileId) {
      return this.canManageProducerProfile(tenantId, userId, event.producerProfileId);
    }
    return event.producerId === userId;
  }

  /**
   * Check if user has active producer membership for any profile.
   */
  async hasProducerAccess(tenantId: string, userId: string): Promise<boolean> {
    const [membership, user] = await Promise.all([
      this.prisma.userProducerMembership.findFirst({
        where: {
          tenantId,
          userId,
          status: 'ACTIVE',
          profile: { status: 'ACTIVE' },
        },
      }),
      this.prisma.user.findFirst({
        where: { id: userId, tenantId, deletedAt: null },
        select: { role: true },
      }),
    ]);
    if (membership) return true;
    return user?.role === 'PRODUCER_OWNER' || user?.role === 'PRODUCER_STAFF';
  }

  /**
   * Check if user has active gastro membership.
   */
  async hasGastroAccess(tenantId: string, userId: string): Promise<boolean> {
    const [membership, user] = await Promise.all([
      this.prisma.userGastroMembership.findFirst({
        where: {
          tenantId,
          userId,
          status: 'ACTIVE',
          profile: { status: 'ACTIVE' },
        },
      }),
      this.prisma.user.findFirst({
        where: { id: userId, tenantId, deletedAt: null },
        select: { role: true },
      }),
    ]);
    if (membership) return true;
    return user?.role === 'GASTRO_OWNER';
  }

  /**
   * Check if user has active referrer membership.
   */
  async hasReferrerAccess(tenantId: string, userId: string): Promise<boolean> {
    const [membership, user] = await Promise.all([
      this.prisma.userReferrerMembership.findFirst({
        where: {
          tenantId,
          userId,
          status: 'ACTIVE',
          profile: { status: 'ACTIVE' },
        },
      }),
      this.prisma.user.findFirst({
        where: { id: userId, tenantId, deletedAt: null },
        select: { role: true },
      }),
    ]);
    if (membership) return true;
    return user?.role === 'REFERRER';
  }

  /**
   * Get first active producer profile id for user (for create flows).
   */
  async getDefaultProducerProfileId(
    tenantId: string,
    userId: string,
  ): Promise<string | null> {
    const membership = await this.prisma.userProducerMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE' },
      },
      select: { profileId: true },
    });
    return membership?.profileId ?? null;
  }
}
