import { z } from 'zod';

export const payoutRequestFormSchema = z.object({
  amountCents: z.number().min(1, 'El monto debe ser mayor a 0'),
  titular: z.string().min(1, 'Titular requerido'),
  banco: z.string().min(1, 'Banco requerido'),
  cbu: z.string().min(1, 'CBU requerido'),
});

export type PayoutRequestFormData = z.infer<typeof payoutRequestFormSchema>;
