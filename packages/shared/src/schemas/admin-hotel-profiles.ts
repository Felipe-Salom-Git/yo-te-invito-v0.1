import { z } from 'zod';

export const adminHotelProfilesListQuerySchema = z.object({
  tenantId: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING', 'DRAFT', 'REJECTED']).optional(),
  includeInactive: z.coerce.boolean().optional(),
});
export type AdminHotelProfilesListQuery = z.infer<typeof adminHotelProfilesListQuerySchema>;

export const adminHotelProfileListItemSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  city: z.string().nullable(),
  status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED']),
  publicEventId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AdminHotelProfileListItem = z.infer<typeof adminHotelProfileListItemSchema>;

export const adminHotelProfilesListResponseSchema = z.object({
  data: z.array(adminHotelProfileListItemSchema),
});
export type AdminHotelProfilesListResponse = z.infer<typeof adminHotelProfilesListResponseSchema>;

export const adminHotelProfileIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type AdminHotelProfileIdParams = z.infer<typeof adminHotelProfileIdParamsSchema>;
