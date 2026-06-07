import { z } from 'zod';

/** Optional reason for admin archive/deactivate/restore actions. */
export const adminContentLifecycleBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type AdminContentLifecycleBody = z.infer<typeof adminContentLifecycleBodySchema>;

export const adminEventIdParamsSchema = z.object({
  eventId: z.string().min(1),
});

export type AdminEventIdParams = z.infer<typeof adminEventIdParamsSchema>;
