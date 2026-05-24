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

/** GET /public/legal/requirements */
export const publicLegalRequirementsResponseSchema = z.object({
  context: legalAcceptanceContextSchema,
  profileType: registrationProfileTypeSchema.nullable().optional(),
  required: z.array(meLegalRequirementItemSchema),
});
export type PublicLegalRequirementsResponse = z.infer<
  typeof publicLegalRequirementsResponseSchema
>;
