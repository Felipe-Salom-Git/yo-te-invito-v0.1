import { z } from 'zod';

const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const openingHoursTimeSchema = z
  .string()
  .regex(HH_MM_REGEX, 'Time must be HH:mm (00:00–23:59)');

export type OpeningHoursTime = z.infer<typeof openingHoursTimeSchema>;

export const openingHoursRangeSchema = z
  .object({
    open: openingHoursTimeSchema,
    close: openingHoursTimeSchema,
  })
  .refine(
    (r) => timeToMinutes(r.open) < timeToMinutes(r.close),
    { message: 'open must be before close', path: ['close'] },
  );

export type OpeningHoursRange = z.infer<typeof openingHoursRangeSchema>;

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
    }
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
    }
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

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

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
