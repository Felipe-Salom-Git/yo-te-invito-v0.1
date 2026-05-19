import { z } from 'zod';

const score1to5 = z.number().min(1).max(5);

/** Restaurant & Producer */
export const reviewRestaurantProducerSchema = z.object({
  servicioBrindado: score1to5,
  atencion: score1to5,
  localEstetica: score1to5,
  comment: z.string().max(500).optional(),
});

/** Excursion & Rental */
export const reviewExcursionRentalSchema = z.object({
  servicio: score1to5,
  atencionBrindada: score1to5,
  comment: z.string().max(500).optional(),
});

/** Generic event (fallback) */
export const reviewGenericSchema = z.object({
  score: score1to5,
  comment: z.string().max(500).optional(),
});

export type ReviewRestaurantProducer = z.infer<typeof reviewRestaurantProducerSchema>;
export type ReviewExcursionRental = z.infer<typeof reviewExcursionRentalSchema>;
export type ReviewGeneric = z.infer<typeof reviewGenericSchema>;

export type EntityType = 'restaurant' | 'producer' | 'excursion' | 'rental' | 'hotel' | 'event';

export function getReviewSchema(entityType: EntityType) {
  switch (entityType) {
    case 'restaurant':
    case 'producer':
      return reviewRestaurantProducerSchema;
    case 'excursion':
    case 'rental':
    case 'hotel':
      return reviewExcursionRentalSchema;
    default:
      return reviewGenericSchema;
  }
}

export function getDimensionLabels(entityType: EntityType): Record<string, string> {
  switch (entityType) {
    case 'restaurant':
    case 'producer':
      return { servicioBrindado: 'Servicio brindado', atencion: 'Atención', localEstetica: 'Local / estética' };
    case 'excursion':
    case 'rental':
    case 'hotel':
      return { servicio: 'Servicio', atencionBrindada: 'Atención brindada' };
    default:
      return { score: 'Puntaje general' };
  }
}
