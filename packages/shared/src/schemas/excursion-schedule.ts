import { z } from 'zod';

const googlePlaceIdOptional = z.string().max(255).nullable().optional();
const provinceOptional = z.string().max(100).nullable().optional();

/** Textual excursion schedule fields (V3.1 — no complex agenda). */
export const excursionScheduleInputSchema = z.object({
  departureTime: z.string().max(80).nullable().optional(),
  durationText: z.string().max(120).nullable().optional(),
  availableDaysText: z.string().max(200).nullable().optional(),
  scheduleNotes: z.string().max(500).nullable().optional(),
  meetingPoint: z.string().max(500).nullable().optional(),
});
export type ExcursionScheduleInput = z.infer<typeof excursionScheduleInputSchema>;

export const excursionSchedulePublicSchema = z.object({
  departureTime: z.string().nullable(),
  durationText: z.string().nullable(),
  availableDaysText: z.string().nullable(),
  scheduleNotes: z.string().nullable(),
  meetingPoint: z.string().nullable(),
});
export type ExcursionSchedulePublic = z.infer<typeof excursionSchedulePublicSchema>;

/** Optional per-excursion location override (falls back to operator on public detail). */
export const excursionProductLocationInputSchema = z.object({
  venueAddress: z.string().max(500).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  province: provinceOptional,
  googlePlaceId: googlePlaceIdOptional,
  geoLat: z.number().nullish(),
  geoLng: z.number().nullish(),
});
export type ExcursionProductLocationInput = z.infer<typeof excursionProductLocationInputSchema>;

export function hasExcursionScheduleContent(
  schedule: Partial<ExcursionSchedulePublic> | null | undefined,
): boolean {
  if (!schedule) return false;
  return Boolean(
    schedule.departureTime?.trim() ||
      schedule.durationText?.trim() ||
      schedule.availableDaysText?.trim() ||
      schedule.scheduleNotes?.trim() ||
      schedule.meetingPoint?.trim(),
  );
}
