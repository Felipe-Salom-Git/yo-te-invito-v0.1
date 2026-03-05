import { z } from 'zod';

export const testValidationBodySchema = z.object({
  name: z.string().min(1, 'name is required'),
});

export type TestValidationBody = z.infer<typeof testValidationBodySchema>;
