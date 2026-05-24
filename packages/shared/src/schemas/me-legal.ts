import { z } from 'zod';
import { registrationProfileTypeSchema } from './user.schema';
import { legalAcceptanceContextSchema, legalDocumentKeySchema } from './legal-documents';

export const meLegalRequirementsQuerySchema = z.object({
  context: legalAcceptanceContextSchema,
  profileType: registrationProfileTypeSchema.optional(),
});
export type MeLegalRequirementsQuery = z.infer<typeof meLegalRequirementsQuerySchema>;

export const meLegalRequirementItemSchema = z.object({
  documentId: z.string(),
  documentKey: legalDocumentKeySchema,
  title: z.string(),
  documentVersionId: z.string(),
  version: z.string(),
  publishedAt: z.string().datetime(),
  publicSlug: z.string().nullable(),
  publicPath: z.string().nullable(),
  context: legalAcceptanceContextSchema,
});
export type MeLegalRequirementItem = z.infer<typeof meLegalRequirementItemSchema>;

export const meLegalRequirementsResponseSchema = z.object({
  context: legalAcceptanceContextSchema,
  profileType: registrationProfileTypeSchema.nullable().optional(),
  pending: z.array(meLegalRequirementItemSchema),
  allAccepted: z.boolean(),
});
export type MeLegalRequirementsResponse = z.infer<typeof meLegalRequirementsResponseSchema>;

export const meLegalAcceptRequestSchema = z.object({
  documentVersionIds: z.array(z.string().min(1)).min(1).max(20),
  context: legalAcceptanceContextSchema,
});
export type MeLegalAcceptRequest = z.infer<typeof meLegalAcceptRequestSchema>;

export const meLegalAcceptanceRecordSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  documentKey: legalDocumentKeySchema,
  documentVersionId: z.string(),
  version: z.string(),
  title: z.string(),
  context: legalAcceptanceContextSchema,
  acceptedAt: z.string().datetime(),
});
export type MeLegalAcceptanceRecord = z.infer<typeof meLegalAcceptanceRecordSchema>;

export const meLegalAcceptResponseSchema = z.object({
  accepted: z.array(meLegalAcceptanceRecordSchema),
  alreadyAccepted: z.array(z.string()),
  context: legalAcceptanceContextSchema,
});
export type MeLegalAcceptResponse = z.infer<typeof meLegalAcceptResponseSchema>;

export const meLegalAcceptanceHistoryResponseSchema = z.object({
  data: z.array(meLegalAcceptanceRecordSchema),
});
export type MeLegalAcceptanceHistoryResponse = z.infer<
  typeof meLegalAcceptanceHistoryResponseSchema
>;

export const publicLegalMissingDocumentSchema = z.object({
  documentKey: legalDocumentKeySchema,
  title: z.string(),
  reason: z.enum(['NO_PUBLISHED_VERSION']),
});
export type PublicLegalMissingDocument = z.infer<typeof publicLegalMissingDocumentSchema>;

/** GET /public/legal/requirements */
export const publicLegalRequirementsResponseSchema = z.object({
  context: legalAcceptanceContextSchema,
  profileType: registrationProfileTypeSchema.nullable().optional(),
  required: z.array(meLegalRequirementItemSchema),
  /** Documents flagged required in catalog but without a PUBLISHED version for this flow. */
  missingRequiredDocuments: z.array(publicLegalMissingDocumentSchema).default([]),
  /** False when signup/checkout cannot proceed (unpublished required docs). */
  canProceed: z.boolean(),
  /** Count of catalog documents required for this context + profile (with or without publish). */
  catalogRequiredCount: z.number().int().min(0),
});
export type PublicLegalRequirementsResponse = z.infer<
  typeof publicLegalRequirementsResponseSchema
>;

/** Legal acceptance bundled with POST /auth/register (transactional signup). */
export const signupLegalAcceptanceSchema = z.object({
  documentVersionIds: z.array(z.string().min(1)).min(1).max(20),
  context: z.literal('SIGNUP').default('SIGNUP'),
});
export type SignupLegalAcceptance = z.infer<typeof signupLegalAcceptanceSchema>;
