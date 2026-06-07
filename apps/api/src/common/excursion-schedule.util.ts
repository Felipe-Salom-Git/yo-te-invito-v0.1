import type { Event } from '@prisma/client';
import type {
  ExcursionScheduleInput,
  ExcursionSchedulePublic,
} from '@yo-te-invito/shared';

type ExcursionSchedulePrismaFields = Pick<
  Event,
  | 'excursionDepartureTime'
  | 'excursionDurationText'
  | 'excursionAvailableDaysText'
  | 'excursionScheduleNotes'
  | 'excursionMeetingPoint'
>;

function trimOrNull(
  value: string | null | undefined,
  max: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function writeExcursionScheduleFields(
  body: ExcursionScheduleInput,
): Partial<ExcursionSchedulePrismaFields> {
  const patch: Partial<ExcursionSchedulePrismaFields> = {};
  if (body.departureTime !== undefined) {
    patch.excursionDepartureTime = trimOrNull(body.departureTime, 80) ?? null;
  }
  if (body.durationText !== undefined) {
    patch.excursionDurationText = trimOrNull(body.durationText, 120) ?? null;
  }
  if (body.availableDaysText !== undefined) {
    patch.excursionAvailableDaysText = trimOrNull(body.availableDaysText, 200) ?? null;
  }
  if (body.scheduleNotes !== undefined) {
    patch.excursionScheduleNotes = trimOrNull(body.scheduleNotes, 500) ?? null;
  }
  if (body.meetingPoint !== undefined) {
    patch.excursionMeetingPoint = trimOrNull(body.meetingPoint, 500) ?? null;
  }
  return patch;
}

export function readExcursionSchedulePublic(
  event: ExcursionSchedulePrismaFields,
): ExcursionSchedulePublic {
  return {
    departureTime: event.excursionDepartureTime,
    durationText: event.excursionDurationText,
    availableDaysText: event.excursionAvailableDaysText,
    scheduleNotes: event.excursionScheduleNotes,
    meetingPoint: event.excursionMeetingPoint,
  };
}
