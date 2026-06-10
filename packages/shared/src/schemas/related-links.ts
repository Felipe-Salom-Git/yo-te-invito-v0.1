import { z } from 'zod';
import { safeExternalUrlSchema } from './external-links';

export const RELATED_LINKS_MAX = 5;

export const relatedLinkTypeSchema = z.enum(['web', 'reserva', 'info', 'redes']);
export type RelatedLinkType = z.infer<typeof relatedLinkTypeSchema>;

export const relatedLinkItemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  url: safeExternalUrlSchema,
  type: relatedLinkTypeSchema.optional(),
  sortOrder: z.number().int().min(0).max(99).optional(),
});
export type RelatedLinkItem = z.infer<typeof relatedLinkItemSchema>;

export const relatedLinksInputSchema = z
  .array(relatedLinkItemSchema)
  .max(RELATED_LINKS_MAX)
  .nullable()
  .optional();

export const relatedLinksPublicSchema = z.array(relatedLinkItemSchema).max(RELATED_LINKS_MAX);

export const RELATED_LINK_TYPE_LABELS_ES: Record<RelatedLinkType, string> = {
  web: 'Sitio web',
  reserva: 'Reserva',
  info: 'Más información',
  redes: 'Redes',
};
