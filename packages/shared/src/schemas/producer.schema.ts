import { z } from 'zod';

export const updateProducerProfileSchema = z.object({
    slug: z.string().optional(),
    displayName: z.string().min(1).optional(),
    legalName: z.string().optional(),
    shortDescription: z.string().optional(),
    longDescription: z.string().optional(),
    logoUrl: z.string().url().optional(),
    coverImageUrl: z.string().url().optional(),
    primaryPhone: z.string().optional(),
    secondaryPhone: z.string().optional(),
    primaryEmail: z.string().email().optional(),
    secondaryEmail: z.string().email().optional(),
    whatsapp: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    socialLinks: z.record(z.string(), z.string().url()).optional(),
});
export type UpdateProducerProfileInput = z.infer<typeof updateProducerProfileSchema>;

export const getProducersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    city: z.string().optional(),
});
export type GetProducersQuery = z.infer<typeof getProducersQuerySchema>;
