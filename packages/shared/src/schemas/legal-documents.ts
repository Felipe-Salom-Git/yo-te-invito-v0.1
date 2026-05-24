import { z } from 'zod';
import { LEGAL_DOCUMENT_KEYS } from '../constants/legal-documents';
import { registrationProfileTypeSchema } from './user.schema';

export const legalDocumentVisibilitySchema = z.enum(['PUBLIC', 'INTERNAL']);
export type LegalDocumentVisibility = z.infer<typeof legalDocumentVisibilitySchema>;

export const legalDocumentVersionStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type LegalDocumentVersionStatus = z.infer<typeof legalDocumentVersionStatusSchema>;

export const legalAcceptanceContextSchema = z.enum([
  'SIGNUP',
  'CHECKOUT',
  'PROFILE_ONBOARDING',
  'PORTAL_ACCESS',
]);
export type LegalAcceptanceContext = z.infer<typeof legalAcceptanceContextSchema>;

export const legalDocumentKeySchema = z.enum(LEGAL_DOCUMENT_KEYS);
export type LegalDocumentKeyValue = z.infer<typeof legalDocumentKeySchema>;

export const adminLegalDocumentKeyParamsSchema = z.object({
  key: legalDocumentKeySchema,
});
export type AdminLegalDocumentKeyParams = z.infer<typeof adminLegalDocumentKeyParamsSchema>;

export const publicLegalDocumentParamsSchema = z.object({
  slug: z.string().min(1).max(120),
});
export type PublicLegalDocumentParams = z.infer<typeof publicLegalDocumentParamsSchema>;

export const publicLegalDocumentQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
});
export type PublicLegalDocumentQuery = z.infer<typeof publicLegalDocumentQuerySchema>;

export const adminLegalDocumentListQuerySchema = z.object({
  visibility: legalDocumentVisibilitySchema.optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});
export type AdminLegalDocumentListQuery = z.infer<typeof adminLegalDocumentListQuerySchema>;

export const legalDocumentVersionResponseSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  version: z.string(),
  status: legalDocumentVersionStatusSchema,
  title: z.string(),
  contentMarkdown: z.string(),
  summary: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  publishedByUserId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type LegalDocumentVersionResponse = z.infer<typeof legalDocumentVersionResponseSchema>;

export const legalDocumentVersionSummarySchema = legalDocumentVersionResponseSchema.omit({
  contentMarkdown: true,
});
export type LegalDocumentVersionSummary = z.infer<typeof legalDocumentVersionSummarySchema>;

export const legalDocumentResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  key: legalDocumentKeySchema,
  title: z.string(),
  description: z.string().nullable(),
  visibility: legalDocumentVisibilitySchema,
  appliesToProfiles: z.array(z.string()),
  isRequiredForSignup: z.boolean(),
  isRequiredForCheckout: z.boolean(),
  isRequiredForPortalAccess: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type LegalDocumentResponse = z.infer<typeof legalDocumentResponseSchema>;

export const adminLegalDocumentListItemSchema = z.object({
  key: legalDocumentKeySchema,
  title: z.string(),
  description: z.string().nullable(),
  visibility: legalDocumentVisibilitySchema,
  appliesToProfiles: z.array(z.string()),
  isRequiredForSignup: z.boolean(),
  isRequiredForCheckout: z.boolean(),
  isRequiredForPortalAccess: z.boolean(),
  isActive: z.boolean(),
  publishedVersion: legalDocumentVersionSummarySchema.nullable(),
  draftVersion: legalDocumentVersionSummarySchema.nullable(),
  updatedAt: z.string().datetime(),
});
export type AdminLegalDocumentListItem = z.infer<typeof adminLegalDocumentListItemSchema>;

export const adminLegalDocumentListResponseSchema = z.object({
  data: z.array(adminLegalDocumentListItemSchema),
});
export type AdminLegalDocumentListResponse = z.infer<typeof adminLegalDocumentListResponseSchema>;

export const adminLegalDocumentDetailSchema = z.object({
  document: legalDocumentResponseSchema,
  publishedVersion: legalDocumentVersionResponseSchema.nullable(),
  draftVersion: legalDocumentVersionResponseSchema.nullable(),
  recentVersions: z.array(legalDocumentVersionSummarySchema),
});
export type AdminLegalDocumentDetail = z.infer<typeof adminLegalDocumentDetailSchema>;

export const adminLegalDocumentVersionsListResponseSchema = z.object({
  document: legalDocumentResponseSchema,
  data: z.array(legalDocumentVersionSummarySchema),
});
export type AdminLegalDocumentVersionsListResponse = z.infer<
  typeof adminLegalDocumentVersionsListResponseSchema
>;

export const publicLegalDocumentResponseSchema = z.object({
  documentId: z.string(),
  documentVersionId: z.string(),
  key: legalDocumentKeySchema,
  slug: z.string(),
  title: z.string(),
  version: z.string(),
  contentMarkdown: z.string(),
  publishedAt: z.string().datetime(),
});
export type PublicLegalDocumentResponse = z.infer<typeof publicLegalDocumentResponseSchema>;

/** GET /public/legal/requirements — documents required for a flow (no auth). */
export const publicLegalRequirementsQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  context: legalAcceptanceContextSchema,
  profileType: registrationProfileTypeSchema.optional(),
});
export type PublicLegalRequirementsQuery = z.infer<typeof publicLegalRequirementsQuerySchema>;

const trimmedTitle = z.string().trim().min(3).max(200);
const trimmedMarkdown = z.string().trim().min(20).max(500_000);

/** PATCH /admin/legal-documents/:key */
export const adminUpdateLegalDocumentSchema = z
  .object({
    title: trimmedTitle.optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    visibility: legalDocumentVisibilitySchema.optional(),
    appliesToProfiles: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    isRequiredForSignup: z.boolean().optional(),
    isRequiredForCheckout: z.boolean().optional(),
    isRequiredForPortalAccess: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
export type AdminUpdateLegalDocument = z.infer<typeof adminUpdateLegalDocumentSchema>;

/** POST /admin/legal-documents/:key/draft */
export const adminSaveLegalDocumentDraftSchema = z.object({
  title: trimmedTitle,
  contentMarkdown: trimmedMarkdown,
  summary: z.string().trim().max(500).nullable().optional(),
});
export type AdminSaveLegalDocumentDraft = z.infer<typeof adminSaveLegalDocumentDraftSchema>;

/** POST /admin/legal-documents/:key/publish */
export const adminPublishLegalDocumentSchema = z.object({
  draftVersionId: z.string().min(1).optional(),
  version: z.string().trim().min(1).max(32).optional(),
});
export type AdminPublishLegalDocument = z.infer<typeof adminPublishLegalDocumentSchema>;

/** Response for PATCH / draft / publish mutations */
export const adminLegalDocumentMutationResponseSchema = z.object({
  document: legalDocumentResponseSchema,
  publishedVersion: legalDocumentVersionResponseSchema.nullable(),
  draftVersion: legalDocumentVersionResponseSchema.nullable(),
});
export type AdminLegalDocumentMutationResponse = z.infer<
  typeof adminLegalDocumentMutationResponseSchema
>;
