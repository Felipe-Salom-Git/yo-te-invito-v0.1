import { z } from 'zod';
import { Role } from '../enums/role';

const adminRoleSchema = z.enum([
  Role.ADMIN,
  Role.PRODUCER_OWNER,
  Role.PRODUCER_STAFF,
  Role.GASTRO_OWNER,
  Role.HOTEL_OWNER,
  Role.REFERRER,
  Role.SCANNER,
  Role.USER,
]);

export const adminUserProfileSummarySchema = z
  .object({
    id: z.string(),
    displayName: z.string(),
    status: z.string(),
  })
  .nullable();

export type AdminUserProfileSummary = z.infer<typeof adminUserProfileSummarySchema>;

export const adminUsersListQuerySchema = z
  .object({
    tenantId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().max(200).optional(),
    role: adminRoleSchema.optional(),
    emailVerified: z.coerce.boolean().optional(),
    createdFrom: z.string().datetime().optional(),
    createdTo: z.string().datetime().optional(),
    hasProducerProfile: z.coerce.boolean().optional(),
    hasGastroProfile: z.coerce.boolean().optional(),
    hasHotelProfile: z.coerce.boolean().optional(),
    hasReferrerProfile: z.coerce.boolean().optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']).optional(),
  })
  .refine(
    (data) => {
      if (!data.createdFrom || !data.createdTo) return true;
      return new Date(data.createdFrom) <= new Date(data.createdTo);
    },
    { message: 'createdFrom must not be greater than createdTo', path: ['createdFrom'] },
  );

export type AdminUsersListQuery = z.infer<typeof adminUsersListQuerySchema>;

export const adminUserListItemSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
  status: z.string(),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  producerProfile: adminUserProfileSummarySchema,
  gastroProfile: adminUserProfileSummarySchema,
  hotelProfile: adminUserProfileSummarySchema,
  referrerProfile: adminUserProfileSummarySchema,
});

export type AdminUserListItem = z.infer<typeof adminUserListItemSchema>;

export const adminUsersListResponseSchema = z.object({
  data: z.array(adminUserListItemSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export type AdminUsersListResponse = z.infer<typeof adminUsersListResponseSchema>;

/** Admin: update role body */
export const adminUpdateRoleBodySchema = z.object({
  role: adminRoleSchema,
});
export type AdminUpdateRoleBody = z.infer<typeof adminUpdateRoleBodySchema>;

export const adminUserDeleteBlockerSchema = z.object({
  type: z.string(),
  count: z.number().int().min(0),
  message: z.string(),
  adminPath: z.string().optional(),
});

export type AdminUserDeleteBlocker = z.infer<typeof adminUserDeleteBlockerSchema>;

export const adminUserDeleteWarningSchema = z.object({
  type: z.string(),
  count: z.number().int().min(0),
  message: z.string(),
});

export type AdminUserDeleteWarning = z.infer<typeof adminUserDeleteWarningSchema>;

export const adminUserDeletePreflightSchema = z.object({
  canDelete: z.boolean(),
  blockers: z.array(adminUserDeleteBlockerSchema),
  warnings: z.array(adminUserDeleteWarningSchema),
});

export type AdminUserDeletePreflight = z.infer<typeof adminUserDeletePreflightSchema>;

export const adminUserDeleteResponseSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
});

export type AdminUserDeleteResponse = z.infer<typeof adminUserDeleteResponseSchema>;
