import { z } from 'zod';
import { adminEventStatusSchema } from './admin-producers';

/** Quick views for admin events list (tabs). */
export const adminEventsListViewSchema = z.enum([
  'all',
  'pending',
  'approved',
  'rejected',
  'active',
  'past',
]);
export type AdminEventsListView = z.infer<typeof adminEventsListViewSchema>;

export const adminEventsListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().max(200).optional(),
    status: adminEventStatusSchema.optional(),
    category: z.enum(['event', 'gastro', 'rental', 'excursion', 'hotel']).optional(),
    subcategoryId: z.string().min(1).optional(),
    city: z.string().max(120).optional(),
    producerProfileId: z.string().min(1).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    pendingOnly: z.coerce.boolean().optional(),
    view: adminEventsListViewSchema.optional(),
  })
  .refine(
    (data) => {
      if (!data.dateFrom || !data.dateTo) return true;
      return new Date(data.dateFrom) <= new Date(data.dateTo);
    },
    { message: 'dateFrom must not be greater than dateTo', path: ['dateFrom'] },
  );
export type AdminEventsListQuery = z.infer<typeof adminEventsListQuerySchema>;

export const adminEventListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string().nullable(),
  subcategoryId: z.string().nullable(),
  subcategoryName: z.string().nullable(),
  status: adminEventStatusSchema,
  city: z.string().nullable(),
  producerProfileId: z.string().nullable(),
  producerName: z.string().nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
});
export type AdminEventListItem = z.infer<typeof adminEventListItemSchema>;

export const adminEventsListResponseSchema = z.object({
  data: z.array(adminEventListItemSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type AdminEventsListResponse = z.infer<typeof adminEventsListResponseSchema>;
