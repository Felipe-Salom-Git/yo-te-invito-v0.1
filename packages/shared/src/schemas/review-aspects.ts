import { z } from 'zod';

/** Public review vertical — aligns with Event.category */
export const publicReviewCategorySchema = z.enum([
  'event',
  'gastro',
  'rental',
  'excursion',
  'hotel',
]);
export type PublicReviewCategory = z.infer<typeof publicReviewCategorySchema>;

export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 10;

export const reviewRatingScoreSchema = z
  .number()
  .int()
  .min(REVIEW_RATING_MIN)
  .max(REVIEW_RATING_MAX);

export type ReviewRatingScore = z.infer<typeof reviewRatingScoreSchema>;

/** Aspect keys per public review category (exactly 4 each). */
export const REVIEW_ASPECT_KEYS = {
  gastro: [
    'foodQuality',
    'staffAttention',
    'placeAmbience',
    'priceQuality',
  ],
  event: [
    'eventOrganization',
    'showExperience',
    'venueComfort',
    'priceExperience',
  ],
  rental: [
    'productCondition',
    'deliveryAttention',
    'availabilityVariety',
    'priceQuality',
  ],
  excursion: [
    'guideCoordination',
    'organizationPunctuality',
    'experienceQuality',
    'groupSafety',
  ],
  hotel: [
    'cleanlinessMaintenance',
    'staffAttention',
    'comfortServices',
    'locationPriceQuality',
  ],
} as const satisfies Record<PublicReviewCategory, readonly string[]>;

export type ReviewAspectKey<C extends PublicReviewCategory> =
  (typeof REVIEW_ASPECT_KEYS)[C][number];

export const REVIEW_ASPECT_LABELS_ES: Record<
  PublicReviewCategory,
  Record<string, string>
> = {
  gastro: {
    foodQuality: 'Calidad de la comida',
    staffAttention: 'Atención del personal',
    placeAmbience: 'Ambiente del lugar',
    priceQuality: 'Relación precio-calidad',
  },
  event: {
    eventOrganization: 'Organización del evento',
    showExperience: 'Calidad del espectáculo / experiencia',
    venueComfort: 'Lugar y comodidad',
    priceExperience: 'Relación precio-experiencia',
  },
  rental: {
    productCondition: 'Estado del producto alquilado',
    deliveryAttention: 'Atención y entrega',
    availabilityVariety: 'Variedad y disponibilidad',
    priceQuality: 'Relación precio-calidad',
  },
  excursion: {
    guideCoordination: 'Guía / coordinación',
    organizationPunctuality: 'Organización y puntualidad',
    experienceQuality: 'Calidad de la experiencia',
    groupSafety: 'Seguridad y cuidado del grupo',
  },
  hotel: {
    cleanlinessMaintenance: 'Limpieza y mantenimiento',
    staffAttention: 'Atención del personal',
    comfortServices: 'Comodidad y servicios',
    locationPriceQuality: 'Ubicación y relación precio-calidad',
  },
};

const aspectRatingsRecordSchema = z.record(z.string(), reviewRatingScoreSchema);

export function getExpectedAspectKeys(category: PublicReviewCategory): readonly string[] {
  return REVIEW_ASPECT_KEYS[category];
}

/** Validates aspect map has exactly the keys for the category, each 1–10. */
export function parseAspectRatingsForCategory(
  category: PublicReviewCategory,
  raw: unknown,
): Record<string, number> {
  const parsed = aspectRatingsRecordSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('aspectRatings must be an object of integer scores 1–10');
  }
  const expected = new Set(getExpectedAspectKeys(category));
  const keys = Object.keys(parsed.data);
  if (keys.length !== expected.size) {
    throw new Error(
      `aspectRatings must include exactly ${expected.size} aspects for category ${category}`,
    );
  }
  for (const key of keys) {
    if (!expected.has(key)) {
      throw new Error(`Invalid aspect "${key}" for category ${category}`);
    }
  }
  for (const key of expected) {
    if (!(key in parsed.data)) {
      throw new Error(`Missing required aspect "${key}" for category ${category}`);
    }
  }
  return parsed.data;
}

export function buildAspectRatingsSchema(category: PublicReviewCategory) {
  const keys = getExpectedAspectKeys(category);
  const shape: Record<string, typeof reviewRatingScoreSchema> = {};
  for (const key of keys) {
    shape[key] = reviewRatingScoreSchema;
  }
  return z.object(shape);
}
