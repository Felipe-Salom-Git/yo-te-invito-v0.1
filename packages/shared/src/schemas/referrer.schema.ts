import { z } from 'zod';

const RelationshipStatusEnum = z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'BLOCKED']);
const RelationshipOriginEnum = z.enum(['REQUESTED_BY_REFERRER', 'INVITED_BY_PRODUCER', 'FREELANCE_CONTACT']);

export const requestAssociationSchema = z.object({
    referrerProfileId: z.string().cuid(),
    notes: z.string().optional(),
    origin: RelationshipOriginEnum.default('INVITED_BY_PRODUCER'),
});
export type RequestAssociationInput = z.infer<typeof requestAssociationSchema>;

export const updateAssociationStatusSchema = z.object({
    status: RelationshipStatusEnum,
    notes: z.string().optional(),
});
export type UpdateAssociationStatusInput = z.infer<typeof updateAssociationStatusSchema>;

export const assignReferrerToEventSchema = z.object({
    referrerProfileId: z.string().cuid(),
    courtesyQuota: z.coerce.number().int().min(0).default(0),
});
export type AssignReferrerToEventInput = z.infer<typeof assignReferrerToEventSchema>;

export const getReferrersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: RelationshipStatusEnum.optional(),
});
export type GetReferrersQuery = z.infer<typeof getReferrersQuerySchema>;
