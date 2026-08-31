import { z } from 'zod';
import { contentCategorySchema } from './subcategories';

export const ADMIN_CAMPAIGN_STATUSES = [
  'DRAFT',
  'SENDING',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'CANCELLED',
] as const;
export type AdminCampaignStatus = (typeof ADMIN_CAMPAIGN_STATUSES)[number];

export const ADMIN_CAMPAIGN_CHANNELS = ['EMAIL', 'WHATSAPP'] as const;
export type AdminCampaignChannel = (typeof ADMIN_CAMPAIGN_CHANNELS)[number];

export const ADMIN_CAMPAIGN_CONTENT_TYPES = [
  'GASTRO_DISCOUNT',
  'ACTIVITY_COUPON',
  'EVENT',
  'EXCURSION',
] as const;
export type AdminCampaignContentType = (typeof ADMIN_CAMPAIGN_CONTENT_TYPES)[number];

export const ADMIN_CAMPAIGN_AUDIENCE_KINDS = [
  'ALL_ELIGIBLE',
  'CITY',
  'FAVORITE_CATEGORY',
  'CONTENT_CLAIMANTS',
] as const;
export type AdminCampaignAudienceKind = (typeof ADMIN_CAMPAIGN_AUDIENCE_KINDS)[number];

export const ADMIN_CAMPAIGN_DELIVERY_STATUSES = [
  'QUEUED',
  'SENT',
  'SKIPPED',
  'FAILED',
] as const;
export type AdminCampaignDeliveryStatus = (typeof ADMIN_CAMPAIGN_DELIVERY_STATUSES)[number];

export const adminCampaignAudienceFilterSchema = z
  .object({
    city: z.string().min(1).max(120).optional(),
    category: contentCategorySchema.optional(),
  })
  .strict();

export type AdminCampaignAudienceFilter = z.infer<typeof adminCampaignAudienceFilterSchema>;

const campaignCopy = {
  subject: z.string().trim().min(1).max(120),
  headline: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2000),
  ctaLabel: z.string().trim().min(1).max(40).default('Ver más'),
  ctaUrl: z.string().trim().url().max(500).optional(),
};

export const createAdminCampaignBodySchema = z
  .object({
    channel: z.enum(ADMIN_CAMPAIGN_CHANNELS),
    contentType: z.enum(ADMIN_CAMPAIGN_CONTENT_TYPES),
    contentId: z.string().min(1).max(64),
    audienceKind: z.enum(ADMIN_CAMPAIGN_AUDIENCE_KINDS),
    audienceFilter: adminCampaignAudienceFilterSchema.optional(),
    ...campaignCopy,
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.audienceKind === 'CITY' && !val.audienceFilter?.city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CITY audience requires audienceFilter.city',
        path: ['audienceFilter', 'city'],
      });
    }
    if (val.audienceKind === 'FAVORITE_CATEGORY' && !val.audienceFilter?.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'FAVORITE_CATEGORY requires audienceFilter.category',
        path: ['audienceFilter', 'category'],
      });
    }
  });

export type CreateAdminCampaignBody = z.infer<typeof createAdminCampaignBodySchema>;

export const updateAdminCampaignBodySchema = z
  .object({
    audienceKind: z.enum(ADMIN_CAMPAIGN_AUDIENCE_KINDS).optional(),
    audienceFilter: adminCampaignAudienceFilterSchema.optional(),
    subject: campaignCopy.subject.optional(),
    headline: campaignCopy.headline.optional(),
    body: campaignCopy.body.optional(),
    ctaLabel: z.string().trim().min(1).max(40).optional(),
    ctaUrl: z.string().trim().url().max(500).nullable().optional(),
  })
  .strict();

export type UpdateAdminCampaignBody = z.infer<typeof updateAdminCampaignBodySchema>;

export const adminCampaignsListQuerySchema = z.object({
  status: z.enum(ADMIN_CAMPAIGN_STATUSES).optional(),
  channel: z.enum(ADMIN_CAMPAIGN_CHANNELS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type AdminCampaignsListQuery = z.infer<typeof adminCampaignsListQuerySchema>;

export const adminCampaignDeliveriesQuerySchema = z.object({
  status: z.enum(ADMIN_CAMPAIGN_DELIVERY_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type AdminCampaignDeliveriesQuery = z.infer<typeof adminCampaignDeliveriesQuerySchema>;

export const adminCampaignContentPickerQuerySchema = z.object({
  contentType: z.enum(ADMIN_CAMPAIGN_CONTENT_TYPES),
  q: z.string().trim().max(80).optional(),
});

export type AdminCampaignContentPickerQuery = z.infer<
  typeof adminCampaignContentPickerQuerySchema
>;

export function canonicalCampaignContentPath(
  contentType: AdminCampaignContentType,
  contentId: string,
): string {
  switch (contentType) {
    case 'GASTRO_DISCOUNT':
      return `/descuentos/${encodeURIComponent(contentId)}`;
    case 'ACTIVITY_COUPON':
      return `/excursiones/cupones/${encodeURIComponent(contentId)}`;
    case 'EVENT':
      return `/events/${encodeURIComponent(contentId)}`;
    case 'EXCURSION':
      return `/excursiones/${encodeURIComponent(contentId)}`;
  }
}

export function isAllowedCampaignCtaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function canEditCampaignDraft(status: AdminCampaignStatus): boolean {
  return status === 'DRAFT';
}

export function canSendCampaign(status: AdminCampaignStatus): boolean {
  return status === 'DRAFT';
}

export function canCancelCampaign(status: AdminCampaignStatus): boolean {
  return status === 'DRAFT' || status === 'SENDING';
}

export function canHardDeleteCampaign(status: AdminCampaignStatus): boolean {
  return status === 'DRAFT';
}

export function canArchiveCampaign(status: AdminCampaignStatus): boolean {
  return (
    status === 'COMPLETED' ||
    status === 'PARTIAL' ||
    status === 'FAILED' ||
    status === 'CANCELLED'
  );
}

export function finalizeCampaignStatus(counts: {
  sent: number;
  skipped: number;
  failed: number;
  cancelRequested: boolean;
}): AdminCampaignStatus {
  if (counts.cancelRequested && counts.sent === 0) return 'CANCELLED';
  if (counts.sent === 0) return 'FAILED';
  if (counts.skipped > 0 || counts.failed > 0 || counts.cancelRequested) return 'PARTIAL';
  return 'COMPLETED';
}

export function maskEmailHint(email: string | null | undefined): string | null {
  if (!email?.trim()) return null;
  const [local, domain] = email.trim().split('@');
  if (!domain || !local) return null;
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}
