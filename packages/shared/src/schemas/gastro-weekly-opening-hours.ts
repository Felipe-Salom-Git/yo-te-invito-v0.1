import { z } from 'zod';
import {
  OPENING_HOURS_DAY_KEYS,
  openingHoursTimeSchema,
  timeToMinutes,
  type OpeningHoursDayKey,
} from './opening-hours';

export const GASTRO_OPENING_HOURS_MODES = ['simple', 'weekly'] as const;
export type GastroOpeningHoursMode = (typeof GASTRO_OPENING_HOURS_MODES)[number];

export const gastroOpeningHoursModeSchema = z.enum(GASTRO_OPENING_HOURS_MODES);

/** Max intervals per calendar day (lunch + dinner + extras). */
export const GASTRO_WEEKLY_MAX_INTERVALS_PER_DAY = 4;

const gastroWeeklyIntervalSchema = z.object({
  open: openingHoursTimeSchema,
  close: openingHoursTimeSchema,
});

export type GastroWeeklyInterval = z.infer<typeof gastroWeeklyIntervalSchema>;

const gastroWeeklyDayIntervalsSchema = z
  .array(gastroWeeklyIntervalSchema)
  .max(GASTRO_WEEKLY_MAX_INTERVALS_PER_DAY);

const gastroWeeklyDayFields = Object.fromEntries(
  OPENING_HOURS_DAY_KEYS.map((key) => [key, gastroWeeklyDayIntervalsSchema]),
) as Record<OpeningHoursDayKey, typeof gastroWeeklyDayIntervalsSchema>;

export const gastroWeeklyOpeningHoursSchema = z
  .object(gastroWeeklyDayFields)
  .superRefine((schedule, ctx) => {
    for (const day of OPENING_HOURS_DAY_KEYS) {
      const intervals = schedule[day];
      if (intervals.length < 2) continue;
      const ranges = intervals.flatMap((interval) => intervalToMinuteRanges(interval));
      if (hasOverlappingRanges(ranges)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Los horarios de ${day} se solapan`,
          path: [day],
        });
      }
    }
  });

export type GastroWeeklyOpeningHours = z.infer<typeof gastroWeeklyOpeningHoursSchema>;

export function createEmptyGastroWeeklyOpeningHours(): GastroWeeklyOpeningHours {
  return {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };
}

/** True when close is on the next calendar day (e.g. 20:00–02:00). */
export function isOvernightInterval(interval: GastroWeeklyInterval): boolean {
  return timeToMinutes(interval.close) <= timeToMinutes(interval.open);
}

type MinuteRange = { start: number; end: number };

function intervalToMinuteRanges(interval: GastroWeeklyInterval): MinuteRange[] {
  const open = timeToMinutes(interval.open);
  const close = timeToMinutes(interval.close);
  if (!isOvernightInterval(interval)) {
    return [{ start: open, end: close }];
  }
  return [
    { start: open, end: 24 * 60 },
    { start: 0, end: close },
  ];
}

function hasOverlappingRanges(ranges: MinuteRange[]): boolean {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) return true;
  }
  return false;
}

export function hasGastroWeeklyOpeningHoursContent(
  schedule: GastroWeeklyOpeningHours | null | undefined,
): boolean {
  if (!schedule) return false;
  return OPENING_HOURS_DAY_KEYS.some((day) => schedule[day].length > 0);
}

export function parseGastroWeeklyOpeningHours(value: unknown): GastroWeeklyOpeningHours | null {
  const parsed = gastroWeeklyOpeningHoursSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function normalizeGastroOpeningHoursMode(
  mode: unknown,
  weekly: GastroWeeklyOpeningHours | null | undefined,
): GastroOpeningHoursMode {
  if (mode === 'weekly' || mode === 'simple') return mode;
  return hasGastroWeeklyOpeningHoursContent(weekly) ? 'weekly' : 'simple';
}

const DAY_LABELS_ES: Record<OpeningHoursDayKey, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export function formatGastroWeeklyInterval(interval: GastroWeeklyInterval): string {
  return `${interval.open} – ${interval.close}`;
}

export function formatGastroWeeklyOpeningHoursCompact(
  schedule: GastroWeeklyOpeningHours | null | undefined,
): string[] {
  if (!schedule) return [];
  return OPENING_HOURS_DAY_KEYS.map((day) => {
    const intervals = schedule[day];
    if (intervals.length === 0) {
      return `${DAY_LABELS_ES[day]}: Cerrado`;
    }
    const times = intervals.map(formatGastroWeeklyInterval).join(', ');
    return `${DAY_LABELS_ES[day]}: ${times}`;
  });
}

/** JS Date.getDay(): 0=Sunday … 6=Saturday → our day keys */
const JS_DAY_TO_KEY: OpeningHoursDayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/** Align with `event-public-visibility.util` tenant default (Argentina). */
export const GASTRO_OPEN_STATUS_TIMEZONE = 'America/Argentina/Buenos_Aires';

export type GastroOpenStatus = 'open' | 'closed' | 'unknown';

export type GastroOpenStatusResult = {
  status: GastroOpenStatus;
  label: string;
  nextChangeLabel?: string;
};

function getNowInTimezone(timeZone: string): { dayKey: OpeningHoursDayKey; minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const dayMap: Record<string, OpeningHoursDayKey> = {
    Sun: 'sunday',
    Mon: 'monday',
    Tue: 'tuesday',
    Wed: 'wednesday',
    Thu: 'thursday',
    Fri: 'friday',
    Sat: 'saturday',
  };
  return {
    dayKey: dayMap[weekday] ?? 'monday',
    minutes: hour * 60 + minute,
  };
}

function isMinuteInsideInterval(minutes: number, interval: GastroWeeklyInterval): boolean {
  const open = timeToMinutes(interval.open);
  const close = timeToMinutes(interval.close);
  if (!isOvernightInterval(interval)) {
    return minutes >= open && minutes < close;
  }
  return minutes >= open || minutes < close;
}

export function getGastroWeeklyOpenStatus(
  schedule: GastroWeeklyOpeningHours | null | undefined,
  timeZone = GASTRO_OPEN_STATUS_TIMEZONE,
): GastroOpenStatusResult {
  if (!hasGastroWeeklyOpeningHoursContent(schedule)) {
    return { status: 'unknown', label: 'Horarios no informados' };
  }

  const { dayKey, minutes } = getNowInTimezone(timeZone);
  const todayIntervals = schedule![dayKey];

  const openNow = todayIntervals.some((interval) => isMinuteInsideInterval(minutes, interval));
  if (openNow) {
    return { status: 'open', label: 'Abierto ahora' };
  }

  const hasAnyHours = OPENING_HOURS_DAY_KEYS.some((d) => schedule![d].length > 0);
  if (!hasAnyHours) {
    return { status: 'unknown', label: 'Horarios no informados' };
  }

  return { status: 'closed', label: 'Cerrado' };
}

export { DAY_LABELS_ES as GASTRO_WEEKLY_DAY_LABELS_ES, JS_DAY_TO_KEY };
