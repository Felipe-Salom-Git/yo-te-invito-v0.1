import { z } from 'zod';

export const checkoutFormSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  phone: z.string().optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;
