import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProfileStatus, type GastroProfile } from '@prisma/client';
import { ErrorCode } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

/** Profiles the owner may view/edit in the gastro portal. */
export const GASTRO_PORTAL_PROFILE_STATUSES: ProfileStatus[] = [
  'DRAFT',
  'PENDING',
  'ACTIVE',
];

/** Profiles that may run discounts, scanners and public discovery. */
export const GASTRO_OPERATIONAL_PROFILE_STATUSES: ProfileStatus[] = ['ACTIVE'];

export type ManagedGastroProfileRow = GastroProfile & {
  subcategory?: { name: string } | null;
};

@Injectable()
export class GastroOwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  /** Pick default profile when caller omits profileId (prefer ACTIVE, then most recently updated). */
  static pickDefaultProfileId(
    profiles: Array<{ id: string; status: ProfileStatus; updatedAt: Date }>,
  ): string | null {
    if (profiles.length === 0) return null;
    const active = profiles.find((p) => p.status === 'ACTIVE');
    if (active) return active.id;
    const sorted = [...profiles].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
    return sorted[0]!.id;
  }

  static pickDefaultOperationalProfileId(
    profiles: Array<{ id: string; status: ProfileStatus; updatedAt: Date }>,
  ): string | null {
    const operational = profiles.filter((p) =>
      GASTRO_OPERATIONAL_PROFILE_STATUSES.includes(p.status),
    );
    return GastroOwnershipService.pickDefaultProfileId(operational);
  }

  async listManagedProfiles(
    tenantId: string,
    userId: string,
  ): Promise<ManagedGastroProfileRow[]> {
    const memberships = await this.prisma.userGastroMembership.findMany({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: { in: GASTRO_PORTAL_PROFILE_STATUSES } },
      },
      include: {
        profile: { include: { subcategory: { select: { name: true } } } },
      },
      orderBy: { profile: { updatedAt: 'desc' } },
    });

    const ownedWithoutMembership = await this.prisma.gastroProfile.findMany({
      where: {
        tenantId,
        createdByUserId: userId,
        status: { in: GASTRO_PORTAL_PROFILE_STATUSES },
        id: { notIn: memberships.map((m) => m.profileId) },
      },
      include: { subcategory: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return [
      ...memberships.map((m) => m.profile),
      ...ownedWithoutMembership,
    ];
  }

  async listOperationalProfiles(
    tenantId: string,
    userId: string,
  ): Promise<ManagedGastroProfileRow[]> {
    const all = await this.listManagedProfiles(tenantId, userId);
    return all.filter((p) => GASTRO_OPERATIONAL_PROFILE_STATUSES.includes(p.status));
  }

  async assertCanManageProfile(
    tenantId: string,
    userId: string,
    profileId: string,
  ): Promise<ManagedGastroProfileRow> {
    const membership = await this.prisma.userGastroMembership.findFirst({
      where: {
        tenantId,
        userId,
        profileId,
        status: 'ACTIVE',
        profile: { status: { in: GASTRO_PORTAL_PROFILE_STATUSES } },
      },
      include: {
        profile: { include: { subcategory: { select: { name: true } } } },
      },
    });
    if (membership) return membership.profile;

    const owned = await this.prisma.gastroProfile.findFirst({
      where: {
        id: profileId,
        tenantId,
        createdByUserId: userId,
        status: { in: GASTRO_PORTAL_PROFILE_STATUSES },
      },
      include: { subcategory: { select: { name: true } } },
    });
    if (owned) return owned;

    throw new ForbiddenException({
      code: ErrorCode.FORBIDDEN,
      message: 'No tenés permiso para gestionar este local gastronómico',
    });
  }

  async assertCanOperateProfile(
    tenantId: string,
    userId: string,
    profileId: string,
  ): Promise<ManagedGastroProfileRow> {
    const profile = await this.assertCanManageProfile(tenantId, userId, profileId);
    if (!GASTRO_OPERATIONAL_PROFILE_STATUSES.includes(profile.status)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Este local debe estar activo para esta operación',
      });
    }
    return profile;
  }

  async resolveManagedProfileId(
    tenantId: string,
    userId: string,
    profileId?: string | null,
  ): Promise<string> {
    if (profileId?.trim()) {
      await this.assertCanManageProfile(tenantId, userId, profileId.trim());
      return profileId.trim();
    }
    const profiles = await this.listManagedProfiles(tenantId, userId);
    const id = GastroOwnershipService.pickDefaultProfileId(profiles);
    if (!id) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No tenés un perfil gastronómico',
      });
    }
    return id;
  }

  async resolveOperationalProfileId(
    tenantId: string,
    userId: string,
    profileId?: string | null,
  ): Promise<string> {
    if (profileId?.trim()) {
      await this.assertCanOperateProfile(tenantId, userId, profileId.trim());
      return profileId.trim();
    }
    const profiles = await this.listOperationalProfiles(tenantId, userId);
    const id = GastroOwnershipService.pickDefaultOperationalProfileId(profiles);
    if (!id) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No tenés un local gastronómico activo',
      });
    }
    return id;
  }

  async getManagedProfileById(
    tenantId: string,
    userId: string,
    profileId?: string | null,
  ): Promise<ManagedGastroProfileRow> {
    const resolvedId = await this.resolveManagedProfileId(tenantId, userId, profileId);
    return this.assertCanManageProfile(tenantId, userId, resolvedId);
  }

  async getOperationalProfileById(
    tenantId: string,
    userId: string,
    profileId?: string | null,
  ): Promise<ManagedGastroProfileRow> {
    const resolvedId = await this.resolveOperationalProfileId(tenantId, userId, profileId);
    return this.assertCanOperateProfile(tenantId, userId, resolvedId);
  }

  /** Registration / onboarding shell without a public listing yet. */
  async findSetupShellProfile(
    tenantId: string,
    userId: string,
  ): Promise<GastroProfile | null> {
    const membership = await this.prisma.userGastroMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: {
          publicEventId: null,
          status: { in: GASTRO_PORTAL_PROFILE_STATUSES },
        },
      },
      include: { profile: true },
      orderBy: { createdAt: 'asc' },
    });
    return membership?.profile ?? null;
  }

  async userCanManageProfile(
    tenantId: string,
    userId: string,
    profileId: string,
  ): Promise<boolean> {
    try {
      await this.assertCanManageProfile(tenantId, userId, profileId);
      return true;
    } catch {
      return false;
    }
  }
}
