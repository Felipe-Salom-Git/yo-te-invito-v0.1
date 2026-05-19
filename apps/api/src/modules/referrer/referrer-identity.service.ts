/**
 * Centralized slug + publicHandle generation for ReferrerProfile.
 * Slug: URL-safe, hyphenated. Handle: alphanumeric only (for @display).
 */
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReferrerIdentityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lowercase, accents stripped, hyphens between word chunks, max 48 chars, min 2 chars or empty. */
  baseSlugFromDisplayName(displayName: string): string {
    const base = displayName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return base.length >= 2 ? base : '';
  }

  /** Lowercase alphanumeric only, compact, max 40 chars, min 2 or empty. */
  baseHandleFromDisplayName(displayName: string): string {
    const base = displayName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 40);
    return base.length >= 2 ? base : '';
  }

  private fallbackBase(kind: 'slug' | 'handle'): string {
    const part = crypto.randomBytes(3).toString('hex');
    return kind === 'slug' ? `referente-${part}` : `ref${part}`;
  }

  async ensureUniqueSlug(
    tenantId: string,
    base: string,
    excludeProfileId?: string,
  ): Promise<string> {
    const root = base.length >= 2 ? base : this.fallbackBase('slug');
    let candidate = root;
    let n = 0;
    while (true) {
      const clash = await this.prisma.referrerProfile.findFirst({
        where: {
          tenantId,
          slug: candidate,
          ...(excludeProfileId ? { id: { not: excludeProfileId } } : {}),
        },
        select: { id: true },
      });
      if (!clash) return candidate;
      n += 1;
      candidate = `${root}-${n}`;
      if (n > 80) {
        candidate = `${root}-${crypto.randomBytes(4).toString('hex')}`;
        break;
      }
    }
    return candidate;
  }

  async ensureUniquePublicHandle(
    tenantId: string,
    base: string,
    excludeProfileId?: string,
  ): Promise<string> {
    const root = base.length >= 2 ? base : this.fallbackBase('handle');
    let candidate = root;
    let n = 0;
    while (true) {
      const clash = await this.prisma.referrerProfile.findFirst({
        where: {
          tenantId,
          publicHandle: candidate,
          ...(excludeProfileId ? { id: { not: excludeProfileId } } : {}),
        },
        select: { id: true },
      });
      if (!clash) return candidate;
      n += 1;
      candidate = `${root}${n}`;
      if (n > 80) {
        candidate = `${root}${crypto.randomBytes(3).toString('hex')}`;
        break;
      }
    }
    return candidate;
  }

  /** New profiles: always assign fresh unique slug + handle from display name. */
  async assignIdentityForNewProfile(
    tenantId: string,
    displayName: string,
  ): Promise<{ slug: string; publicHandle: string }> {
    const slugBase = this.baseSlugFromDisplayName(displayName);
    const handleBase = this.baseHandleFromDisplayName(displayName);
    const slug = await this.ensureUniqueSlug(
      tenantId,
      slugBase || this.fallbackBase('slug'),
    );
    const publicHandle = await this.ensureUniquePublicHandle(
      tenantId,
      handleBase || this.fallbackBase('handle'),
    );
    return { slug, publicHandle };
  }

  /**
   * Existing row: keep non-null slug/handle; only fill missing (safe backfill).
   */
  async ensureIdentityForExistingProfile(
    tenantId: string,
    displayName: string,
    profileId: string,
    current: { slug: string | null; publicHandle: string | null },
  ): Promise<{ slug: string; publicHandle: string }> {
    let slug = current.slug;
    if (!slug) {
      const slugBase = this.baseSlugFromDisplayName(displayName);
      slug = await this.ensureUniqueSlug(
        tenantId,
        slugBase || this.fallbackBase('slug'),
        profileId,
      );
    }
    let publicHandle = current.publicHandle;
    if (!publicHandle) {
      const handleBase = this.baseHandleFromDisplayName(displayName);
      publicHandle = await this.ensureUniquePublicHandle(
        tenantId,
        handleBase || this.fallbackBase('handle'),
        profileId,
      );
    }
    return { slug, publicHandle };
  }
}
