import { z } from 'zod';

const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINUTES_PER_DAY = 24 * 60;

export const openingHoursTimeSchema = z
  .string()
  .regex(HH_MM_REGEX, 'Time must be HH:mm (00:00–23:59)');

export type OpeningHoursTime = z.infer<typeof openingHoursTimeSchema>;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** True when close is strictly earlier than open (e.g. 20:00→02:00 or 20:00→00:00). */
export function isOvernightInterval(interval: { open: string; close: string }): boolean {
  return timeToMinutes(interval.close) < timeToMinutes(interval.open);
}

export type NormalizedTimeRange = {
  startMinutes: number;
  /** Exclusive end; may be > 24*60 when the range crosses midnight. */
  endMinutes: number;
};

/**
 * Normalize a range for comparison. Same-day: end > start.
 * Overnight (end < start): end += 24h. Equal open/close → null (invalid; 24h not supported).
 */
export function normalizeTimeRange(
  open: string,
  close: string,
): NormalizedTimeRange | null {
  const startMinutes = timeToMinutes(open);
  let endMinutes = timeToMinutes(close);
  if (endMinutes === startMinutes) return null;
  if (endMinutes < startMinutes) {
    endMinutes += MINUTES_PER_DAY;
  }
  return { startMinutes, endMinutes };
}

export function isValidOpeningHoursRange(open: string, close: string): boolean {
  return normalizeTimeRange(open, close) != null;
}

/** Half-open intervals [start, end); contiguous ranges do not overlap. */
export function openingHourRangesOverlap(
  a: NormalizedTimeRange,
  b: NormalizedTimeRange,
): boolean {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export function hasOverlappingOpeningHourRanges(
  ranges: Array<{ open: string; close: string }>,
): boolean {
  const normalized: NormalizedTimeRange[] = [];
  for (const range of ranges) {
    const n = normalizeTimeRange(range.open, range.close);
    if (!n) continue;
    normalized.push(n);
  }
  const sorted = [...normalized].sort((x, y) => x.startMinutes - y.startMinutes);
  for (let i = 1; i < sorted.length; i++) {
    if (openingHourRangesOverlap(sorted[i - 1]!, sorted[i]!)) return true;
  }
  return false;
}

export const OPENING_HOURS_EQUAL_RANGE_MESSAGE =
  'La hora de cierre debe ser diferente de la hora de apertura.';
export const OPENING_HOURS_OVERLAP_MESSAGE =
  'Este rango horario se superpone con otro del mismo día.';

export const openingHoursRangeSchema = z
  .object({
    open: openingHoursTimeSchema,
    close: openingHoursTimeSchema,
  })
  .superRefine((r, ctx) => {
    if (timeToMinutes(r.open) === timeToMinutes(r.close)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: OPENING_HOURS_EQUAL_RANGE_MESSAGE,
        path: ['close'],
      });
    }
  });

export type OpeningHoursRange = z.infer<typeof openingHoursRangeSchema>;

function refineBlockRangesNoOverlap(
  ranges: OpeningHoursRange[],
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[] = ['ranges'],
) {
  if (ranges.length < 2) return;
  if (hasOverlappingOpeningHourRanges(ranges)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: OPENING_HOURS_OVERLAP_MESSAGE,
      path: pathPrefix,
    });
  }
}

export const openingHoursBlockSchema = z
  .object({
    isOpen: z.boolean(),
    ranges: z.array(openingHoursRangeSchema),
  })
  .superRefine((block, ctx) => {
    if (!block.isOpen) {
      if (block.ranges.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ranges must be empty when closed',
          path: ['ranges'],
        });
      }
      return;
    }
    if (block.ranges.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'at least one range is required when open',
        path: ['ranges'],
      });
      return;
    }
    refineBlockRangesNoOverlap(block.ranges, ctx);
  });

export type OpeningHoursBlock = z.infer<typeof openingHoursBlockSchema>;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const openingHoursExceptionSchema = z
  .object({
    date: z.string().regex(ISO_DATE_REGEX, 'date must be YYYY-MM-DD'),
    label: z.string().min(1).max(200),
    isOpen: z.boolean(),
    ranges: z.array(openingHoursRangeSchema),
  })
  .superRefine((ex, ctx) => {
    if (!ex.isOpen) {
      if (ex.ranges.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ranges must be empty when exception is closed',
          path: ['ranges'],
        });
      }
      return;
    }
    if (ex.ranges.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'at least one range is required when exception is open',
        path: ['ranges'],
      });
      return;
    }
    refineBlockRangesNoOverlap(ex.ranges, ctx);
  });

export type OpeningHoursException = z.infer<typeof openingHoursExceptionSchema>;

/** Rentals schedule: weekday + saturday + sunday + date exceptions. */
export const rentalOpeningHoursSchema = z.object({
  weekday: openingHoursBlockSchema,
  saturday: openingHoursBlockSchema,
  sunday: openingHoursBlockSchema,
  exceptions: z.array(openingHoursExceptionSchema),
});

export type RentalOpeningHours = z.infer<typeof rentalOpeningHoursSchema>;

/** Legacy shape with combined weekend block (migrated on read). */
const rentalOpeningHoursLegacyWeekendSchema = z.object({
  weekday: openingHoursBlockSchema,
  weekend: openingHoursBlockSchema,
  exceptions: z.array(openingHoursExceptionSchema).optional(),
});

/** @deprecated Legacy day-by-day JSON. */
export const OPENING_HOURS_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type OpeningHoursDayKey = (typeof OPENING_HOURS_DAY_KEYS)[number];

const legacyDayFields = Object.fromEntries(
  OPENING_HOURS_DAY_KEYS.map((key) => [key, openingHoursBlockSchema]),
) as Record<OpeningHoursDayKey, typeof openingHoursBlockSchema>;

const legacyWeeklyOpeningHoursSchema = z.object(legacyDayFields);

const closedBlock = (): OpeningHoursBlock => ({ isOpen: false, ranges: [] });

function cloneBlock(block: OpeningHoursBlock): OpeningHoursBlock {
  return {
    isOpen: block.isOpen,
    ranges: block.ranges.map((r) => ({ ...r })),
  };
}

export function createEmptyRentalOpeningHours(): RentalOpeningHours {
  return {
    weekday: closedBlock(),
    saturday: closedBlock(),
    sunday: closedBlock(),
    exceptions: [],
  };
}

function sanitizeOpeningHoursBlock(block: OpeningHoursBlock): OpeningHoursBlock {
  if (!block.isOpen) {
    return { isOpen: false, ranges: [] };
  }
  const ranges = block.ranges.filter(
    (r) =>
      r.open?.trim() &&
      r.close?.trim() &&
      isValidOpeningHoursRange(r.open.trim(), r.close.trim()),
  );
  if (ranges.length === 0) {
    return { isOpen: false, ranges: [] };
  }
  return { isOpen: true, ranges };
}

function sanitizeOpeningHoursException(ex: OpeningHoursException): OpeningHoursException {
  if (!ex.isOpen) {
    return { ...ex, ranges: [] };
  }
  const ranges = ex.ranges.filter(
    (r) =>
      r.open?.trim() &&
      r.close?.trim() &&
      isValidOpeningHoursRange(r.open.trim(), r.close.trim()),
  );
  return { ...ex, isOpen: ranges.length > 0, ranges };
}

/** Drop empty/invalid ranges before API validation (forms may send partial time inputs). */
export function sanitizeRentalOpeningHours(schedule: RentalOpeningHours): RentalOpeningHours {
  return {
    weekday: sanitizeOpeningHoursBlock(schedule.weekday),
    saturday: sanitizeOpeningHoursBlock(schedule.saturday),
    sunday: sanitizeOpeningHoursBlock(schedule.sunday),
    exceptions: schedule.exceptions.map(sanitizeOpeningHoursException),
  };
}

/**
 * Returns a user-facing error when open days have invalid intervals after sanitization,
 * or null if the schedule is safe to submit.
 */
export function validateRentalOpeningHoursForSubmit(
  schedule: RentalOpeningHours,
): string | null {
  const blocks: Array<[string, OpeningHoursBlock]> = [
    ['Lunes a viernes', schedule.weekday],
    ['Sábado', schedule.saturday],
    ['Domingo', schedule.sunday],
  ];
  for (const [label, block] of blocks) {
    if (!block.isOpen) continue;
    for (const range of block.ranges) {
      const open = range.open?.trim();
      const close = range.close?.trim();
      if (!open || !close) continue;
      if (timeToMinutes(open) === timeToMinutes(close)) {
        return `${OPENING_HOURS_EQUAL_RANGE_MESSAGE} (${label})`;
      }
    }
    const complete = block.ranges.filter((r) => r.open?.trim() && r.close?.trim());
    if (complete.length >= 2 && hasOverlappingOpeningHourRanges(complete)) {
      return `${OPENING_HOURS_OVERLAP_MESSAGE} (${label})`;
    }
  }
  return null;
}

function formatBlock(block: OpeningHoursBlock): string {
  if (!block.isOpen || block.ranges.length === 0) return 'Cerrado';
  return block.ranges.map((r) => `${r.open} – ${r.close}`).join(', ');
}

function formatExceptionDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

function migrateLegacyWeekendShape(
  data: z.infer<typeof rentalOpeningHoursLegacyWeekendSchema>,
): RentalOpeningHours {
  const weekend = cloneBlock(data.weekend);
  return {
    weekday: cloneBlock(data.weekday),
    saturday: weekend,
    sunday: cloneBlock(weekend),
    exceptions: data.exceptions ?? [],
  };
}

function migrateLegacyWeeklyToRental(
  weekly: z.infer<typeof legacyWeeklyOpeningHoursSchema>,
): RentalOpeningHours {
  return {
    weekday: cloneBlock(weekly.monday),
    saturday: cloneBlock(weekly.saturday),
    sunday: cloneBlock(weekly.sunday),
    exceptions: [],
  };
}

/** Parse rentals schedule; migrates legacy JSON shapes. */
export function parseRentalOpeningHours(value: unknown): RentalOpeningHours | null {
  const current = rentalOpeningHoursSchema.safeParse(value);
  if (current.success) return current.data;

  const legacyWeekend = rentalOpeningHoursLegacyWeekendSchema.safeParse(value);
  if (legacyWeekend.success) return migrateLegacyWeekendShape(legacyWeekend.data);

  const legacyWeekly = legacyWeeklyOpeningHoursSchema.safeParse(value);
  if (legacyWeekly.success) return migrateLegacyWeeklyToRental(legacyWeekly.data);

  return null;
}

/** Lines for admin/public display */
export function formatRentalOpeningHoursCompact(
  schedule: RentalOpeningHours | null | undefined,
): string[] {
  if (!schedule) return [];
  const lines: string[] = [];

  lines.push(`Lunes a viernes: ${formatBlock(schedule.weekday)}`);
  lines.push(`Sábado: ${formatBlock(schedule.saturday)}`);
  lines.push(`Domingo: ${formatBlock(schedule.sunday)}`);

  for (const ex of schedule.exceptions) {
    const prefix = `${formatExceptionDate(ex.date)} — ${ex.label}`;
    if (!ex.isOpen) {
      lines.push(`${prefix} — Cerrado`);
    } else {
      lines.push(`${prefix} — ${ex.ranges.map((r) => `${r.open} – ${r.close}`).join(', ')}`);
    }
  }

  return lines;
}

function formatBlockSummary(block: OpeningHoursBlock): string {
  if (!block.isOpen || block.ranges.length === 0) return 'Cerrado';
  return block.ranges.map((r) => `${r.open} - ${r.close}`).join(' / ');
}

export type RentalOpeningHoursSummary = {
  lines: string[];
  exceptions: string[];
};

/** Compact public display: Lun a Vie · 09:00 - 18:00 */
export function formatRentalOpeningHoursSummary(
  schedule: RentalOpeningHours | null | undefined,
): RentalOpeningHoursSummary {
  if (!schedule) return { lines: [], exceptions: [] };

  const lines = [
    `Lun a Vie · ${formatBlockSummary(schedule.weekday)}`,
    `Sáb · ${formatBlockSummary(schedule.saturday)}`,
    `Dom · ${formatBlockSummary(schedule.sunday)}`,
  ];

  const exceptions = schedule.exceptions.map((ex) => {
    const time =
      ex.isOpen && ex.ranges.length > 0
        ? ex.ranges.map((r) => `${r.open} - ${r.close}`).join(' / ')
        : 'Cerrado';
    return `${ex.label} ${formatExceptionDate(ex.date)} · ${time}`;
  });

  return { lines, exceptions };
}

/** @deprecated Use parseRentalOpeningHours */
export const parseWeeklyOpeningHours = parseRentalOpeningHours;

/** @deprecated Use RentalOpeningHours */
export type WeeklyOpeningHours = RentalOpeningHours;

/** @deprecated Use createEmptyRentalOpeningHours */
export const createEmptyWeeklyOpeningHours = createEmptyRentalOpeningHours;

/** @deprecated Use formatRentalOpeningHoursCompact */
export const formatWeeklyOpeningHoursCompact = formatRentalOpeningHoursCompact;

export const rentalOpeningHoursSchemaForWrite = rentalOpeningHoursSchema;
