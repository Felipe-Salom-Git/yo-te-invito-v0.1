'use client';

import { useState } from 'react';
import {
  createEmptyGastroWeeklyOpeningHours,
  GASTRO_WEEKLY_DAY_LABELS_ES,
  OPENING_HOURS_DAY_KEYS,
  type GastroWeeklyInterval,
  type GastroWeeklyOpeningHours,
  type OpeningHoursDayKey,
} from '@yo-te-invito/shared';

export type WeeklyOpeningHoursEditorProps = {
  value: GastroWeeklyOpeningHours;
  onChange: (value: GastroWeeklyOpeningHours) => void;
};

function cloneWeekly(schedule: GastroWeeklyOpeningHours): GastroWeeklyOpeningHours {
  return Object.fromEntries(
    OPENING_HOURS_DAY_KEYS.map((day) => [
      day,
      schedule[day].map((interval) => ({ ...interval })),
    ]),
  ) as GastroWeeklyOpeningHours;
}

function DayIntervalsEditor({
  day,
  intervals,
  onChange,
  onCopy,
}: {
  day: OpeningHoursDayKey;
  intervals: GastroWeeklyInterval[];
  onChange: (intervals: GastroWeeklyInterval[]) => void;
  onCopy: () => void;
}) {
  const isClosed = intervals.length === 0;

  const setInterval = (index: number, field: 'open' | 'close', time: string) => {
    const next = intervals.map((interval, i) =>
      i === index ? { ...interval, [field]: time } : interval,
    );
    onChange(next);
  };

  return (
    <section className="rounded-lg border border-border bg-bg-muted p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium text-text">{GASTRO_WEEKLY_DAY_LABELS_ES[day]}</h3>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs text-accent hover:underline"
        >
          Copiar a…
        </button>
      </div>

      <label className="mt-2 flex items-center gap-2 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={!isClosed}
          onChange={(e) =>
            onChange(
              e.target.checked ? [{ open: '12:00', close: '15:00' }] : [],
            )
          }
          className="rounded border-border"
        />
        Abierto
      </label>

      {!isClosed ? (
        <div className="mt-3 space-y-2">
          {intervals.map((interval, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={interval.open}
                onChange={(e) => setInterval(index, 'open', e.target.value)}
                className="rounded border border-border bg-bg px-2 py-1.5 text-sm text-text"
              />
              <span className="text-text-muted">–</span>
              <input
                type="time"
                value={interval.close}
                onChange={(e) => setInterval(index, 'close', e.target.value)}
                className="rounded border border-border bg-bg px-2 py-1.5 text-sm text-text"
              />
              {intervals.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onChange(intervals.filter((_, i) => i !== index))}
                  className="text-sm text-red-400 hover:underline"
                >
                  Quitar
                </button>
              ) : null}
            </div>
          ))}
          {intervals.length < 4 ? (
            <button
              type="button"
              onClick={() =>
                onChange([...intervals, { open: '20:00', close: '23:00' }])
              }
              className="text-sm text-accent hover:underline"
            >
              + Agregar franja
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-text-muted">Cerrado</p>
      )}
    </section>
  );
}

type CopyTarget = OpeningHoursDayKey | 'weekdays' | 'all';

const COPY_OPTIONS: { id: CopyTarget; label: string }[] = [
  ...OPENING_HOURS_DAY_KEYS.map((day) => ({
    id: day as CopyTarget,
    label: GASTRO_WEEKLY_DAY_LABELS_ES[day],
  })),
  { id: 'weekdays', label: 'Lunes a viernes' },
  { id: 'all', label: 'Todos los días' },
];

function resolveCopyTargets(target: CopyTarget): OpeningHoursDayKey[] {
  if (target === 'all') return [...OPENING_HOURS_DAY_KEYS];
  if (target === 'weekdays') {
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  }
  return [target];
}

export function WeeklyOpeningHoursEditor({ value, onChange }: WeeklyOpeningHoursEditorProps) {
  const [copyFromDay, setCopyFromDay] = useState<OpeningHoursDayKey | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const updateDay = (day: OpeningHoursDayKey, intervals: GastroWeeklyInterval[]) => {
    onChange({ ...cloneWeekly(value), [day]: intervals });
  };

  const startCopy = (day: OpeningHoursDayKey) => {
    setCopyFromDay(day);
    setCopyFeedback(null);
  };

  const applyCopy = (target: CopyTarget) => {
    if (!copyFromDay) return;
    const source = value[copyFromDay].map((interval) => ({ ...interval }));
    const next = cloneWeekly(value);
    for (const day of resolveCopyTargets(target)) {
      if (day === copyFromDay) continue;
      next[day] = source.map((interval) => ({ ...interval }));
    }
    onChange(next);
    setCopyFromDay(null);
    setCopyFeedback('Horario copiado.');
    window.setTimeout(() => setCopyFeedback(null), 2500);
  };

  return (
    <div className="space-y-4">
      {copyFeedback ? (
        <p className="text-sm text-accent" role="status">
          {copyFeedback}
        </p>
      ) : null}

      {OPENING_HOURS_DAY_KEYS.map((day) => (
        <DayIntervalsEditor
          key={day}
          day={day}
          intervals={value[day]}
          onChange={(intervals) => updateDay(day, intervals)}
          onCopy={() => startCopy(day)}
        />
      ))}

      {copyFromDay ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="copy-hours-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-bg p-5 shadow-xl">
            <h4 id="copy-hours-title" className="text-base font-semibold text-text">
              Copiar horario de {GASTRO_WEEKLY_DAY_LABELS_ES[copyFromDay]}
            </h4>
            <p className="mt-2 text-sm text-text-muted">
              Esto reemplazará los horarios de los días seleccionados.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {COPY_OPTIONS.filter((opt) => opt.id !== copyFromDay).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => applyCopy(opt.id)}
                  className="rounded-lg border border-border px-3 py-2 text-left text-sm text-text hover:border-accent/50 hover:bg-accent/5"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCopyFromDay(null)}
              className="mt-4 w-full rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-bg-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { createEmptyGastroWeeklyOpeningHours };
