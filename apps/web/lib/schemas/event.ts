import { z } from 'zod';
import { PUBLIC_SUMMARY_MAX_LENGTH } from '@yo-te-invito/shared';

export const eventFormSchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  summary: z
    .string()
    .max(PUBLIC_SUMMARY_MAX_LENGTH, `Máximo ${PUBLIC_SUMMARY_MAX_LENGTH} caracteres`)
    .optional(),
  description: z.string().optional(),
  startAt: z.string().min(1, 'Fecha de inicio requerida'),
  endAt: z.string().optional(),
  city: z.string().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  capacityTotal: z.number().int().min(0).nullable().optional(),
  geoLat: z.number().nullable().optional(),
  geoLng: z.number().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  isTicketingEnabled: z.boolean().default(true),
  status: z.enum(['draft', 'pending', 'approved']).default('draft'),
});

export const tandaFormItemSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  price: z.number().min(0),
  capacityAvailable: z.number().int().min(1),
});
export type TandaFormItem = z.infer<typeof tandaFormItemSchema>;

export const ticketTypeFormSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  price: z.number().min(0),
  capacityAvailable: z.number().int().min(1),
});

export type EventFormData = z.infer<typeof eventFormSchema>;
export type TicketTypeFormData = z.infer<typeof ticketTypeFormSchema>;
