import { z } from 'zod';

export const platformConfigCategorySchema = z.object({
  id: z.string(),
  label: z.string(),
});
export type PlatformConfigCategory = z.infer<typeof platformConfigCategorySchema>;

export const platformConfigContactSchema = z.object({
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
});
export type PlatformConfigContact = z.infer<typeof platformConfigContactSchema>;

export const platformConfigSchema = z.object({
  contact: platformConfigContactSchema,
  categories: z.array(platformConfigCategorySchema).default([]),
});
export type PlatformConfig = z.infer<typeof platformConfigSchema>;

/** Admin: PATCH /admin/config body */
export const adminConfigPatchSchema = z.object({
  contact: platformConfigContactSchema.optional(),
  categories: z.array(platformConfigCategorySchema).optional(),
});
export type AdminConfigPatch = z.infer<typeof adminConfigPatchSchema>;
