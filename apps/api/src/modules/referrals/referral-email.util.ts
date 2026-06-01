import type { ReferralCommissionType } from '@yo-te-invito/shared';
import { getAppUrl, getDefaultSupportEmail } from '../../email/templates/email-template.util';
import type { PrismaService } from '../../prisma/prisma.service';

export { REFERRAL_EMAIL_DISCLAIMER_TEXT } from '../../email/templates/referral-email-layout.util';

export function formatCommissionTypeLabel(type: ReferralCommissionType): string {
  return type === 'PERCENTAGE' ? 'Porcentaje' : 'Monto fijo por entrada';
}

export function formatCommissionValueDisplay(
  type: ReferralCommissionType,
  value: number,
): string {
  if (type === 'PERCENTAGE') return `${value}%`;
  return formatMoneyFromCents(value);
}

export function formatMoneyFromCents(cents: number, currency = 'ARS'): string {
  const major = cents / 100;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(major);
}

export function referrerDashboardUrl(): string {
  return `${getAppUrl()}/referrer`;
}

export function producerReferralsUrl(): string {
  return `${getAppUrl()}/producer/referrals`;
}

export function producerReferrersUrl(): string {
  return `${getAppUrl()}/producer/referrers`;
}

export function referrerProposalUrl(eventId: string): string {
  return `${getAppUrl()}/referrer/eventos/${eventId}`;
}

export async function resolveReferrerRecipientEmails(
  prisma: PrismaService,
  tenantId: string,
  referrerProfileId: string,
): Promise<Array<{ userId: string; email: string; name: string }>> {
  const memberships = await prisma.userReferrerMembership.findMany({
    where: {
      tenantId,
      profileId: referrerProfileId,
      status: 'ACTIVE',
      profile: { status: 'ACTIVE' },
    },
    select: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true, deletedAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const seen = new Set<string>();
  const out: Array<{ userId: string; email: string; name: string }> = [];
  for (const m of memberships) {
    const u = m.user;
    if (!u?.email?.trim() || u.deletedAt) continue;
    const email = u.email.trim().toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || 'Referido';
    out.push({ userId: u.id, email: u.email.trim(), name });
  }
  return out;
}

export async function resolveProducerRecipientEmails(
  prisma: PrismaService,
  tenantId: string,
  producerProfileId: string,
): Promise<Array<{ userId: string; email: string; name: string }>> {
  const memberships = await prisma.userProducerMembership.findMany({
    where: {
      tenantId,
      profileId: producerProfileId,
      status: 'ACTIVE',
    },
    select: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true, deletedAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const profile = await prisma.producerProfile.findFirst({
    where: { id: producerProfileId, tenantId },
    select: {
      displayName: true,
      createdByUserId: true,
    },
  });

  const creatorUser =
    profile?.createdByUserId != null
      ? await prisma.user.findFirst({
          where: { id: profile.createdByUserId, tenantId, deletedAt: null },
          select: { id: true, email: true, firstName: true, lastName: true, deletedAt: true },
        })
      : null;

  const seen = new Set<string>();
  const out: Array<{ userId: string; email: string; name: string }> = [];

  const pushUser = (u: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    deletedAt: Date | null;
  }) => {
    if (!u.email?.trim() || u.deletedAt) return;
    const email = u.email.trim().toLowerCase();
    if (seen.has(email)) return;
    seen.add(email);
    out.push({
      userId: u.id,
      email: u.email.trim(),
      name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || profile?.displayName || 'Productor',
    });
  };

  for (const m of memberships) {
    if (m.user) pushUser(m.user);
  }
  if (creatorUser) pushUser(creatorUser);

  return out;
}

export function defaultSupportEmail(): string {
  return getDefaultSupportEmail();
}
