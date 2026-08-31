'use client';

import { useState } from 'react';
import { Button, Input } from '@/components';
import { GASTRO_WEEKDAY_LABELS_ES, type ActivityCouponCreateInput, type ActivityCouponResponse, type GastroWeekday } from '@yo-te-invito/shared';

const WEEKDAYS = Object.keys(GASTRO_WEEKDAY_LABELS_ES) as GastroWeekday[];

export type ActivityCouponFormValue = {
  eventId: string;
  title: string;
  summary: string;
  detail: string;
  type: 'PERCENT' | 'FIXED';
  value: string;
  validityMode: 'DATE_RANGE' | 'WEEKLY_RECURRING';
  validFrom: string;
  validTo: string;
  validWeekday: GastroWeekday | '';
  imageUrl: string;
};

export function emptyActivityCouponForm(eventId = ''): ActivityCouponFormValue {
  return {
    eventId,
    title: '',
    summary: '',
    detail: '',
    type: 'PERCENT',
    value: '',
    validityMode: 'DATE_RANGE',
    validFrom: '',
    validTo: '',
    validWeekday: '',
    imageUrl: '',
  };
}

export function activityCouponToForm(c: ActivityCouponResponse): ActivityCouponFormValue {
  return {
    eventId: c.eventId,
    title: c.title,
    summary: c.summary,
    detail: c.detail,
    type: c.type,
    value: String(c.value),
    validityMode: c.validityMode,
    validFrom: c.validFrom ? c.validFrom.slice(0, 10) : '',
    validTo: c.validTo ? c.validTo.slice(0, 10) : '',
    validWeekday: (c.validWeekday ?? '') as GastroWeekday | '',
    imageUrl: c.imageUrls[0] ?? '',
  };
}

export function activityCouponFormToCreateInput(form: ActivityCouponFormValue): ActivityCouponCreateInput {
  const value = Number(form.value);
  const imageUrls = form.imageUrl.trim() ? [form.imageUrl.trim()] : [];
  return {
    eventId: form.eventId,
    title: form.title.trim(),
    summary: form.summary.trim(),
    detail: form.detail.trim(),
    type: form.type,
    value,
    validityMode: form.validityMode,
    ...(form.validityMode === 'DATE_RANGE'
      ? { validFrom: form.validFrom, validTo: form.validTo }
      : { validWeekday: form.validWeekday as GastroWeekday }),
    ...(imageUrls.length ? { imageUrls } : {}),
  };
}

type EventOption = { id: string; title: string };

export function AdminActivityCouponForm({
  events,
  value,
  onChange,
  onSubmit,
  submitting,
  submitLabel,
  lockEvent,
}: {
  events: EventOption[];
  value: ActivityCouponFormValue;
  onChange: (next: ActivityCouponFormValue) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
  lockEvent?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<ActivityCouponFormValue>) => onChange({ ...value, ...patch });

  return (
    <form
      className="mt-6 max-w-xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!value.eventId) {
          setError('Elegí una actividad');
          return;
        }
        if (!value.title.trim() || !value.summary.trim() || !value.detail.trim()) {
          setError('Completá título, resumen y detalle');
          return;
        }
        const n = Number(value.value);
        if (!Number.isFinite(n) || n <= 0) {
          setError('Indicá un valor de beneficio');
          return;
        }
        if (value.validityMode === 'DATE_RANGE' && (!value.validFrom || !value.validTo)) {
          setError('Indicá vigencia desde/hasta');
          return;
        }
        if (value.validityMode === 'WEEKLY_RECURRING' && !value.validWeekday) {
          setError('Elegí el día de la semana');
          return;
        }
        onSubmit();
      }}
    >
      <label className="block text-sm">
        <span className="mb-1 block text-text-muted">Actividad</span>
        <select
          className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          value={value.eventId}
          disabled={lockEvent}
          onChange={(e) => set({ eventId: e.target.value })}
        >
          <option value="">Seleccionar…</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
      </label>
      <Input label="Título" value={value.title} onChange={(e) => set({ title: e.target.value })} />
      <Input label="Resumen" value={value.summary} onChange={(e) => set({ summary: e.target.value })} />
      <label className="block text-sm">
        <span className="mb-1 block text-text-muted">Detalle</span>
        <textarea
          className="min-h-[96px] w-full rounded border border-border bg-bg px-3 py-2 text-text"
          value={value.detail}
          onChange={(e) => set({ detail: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-text-muted">Tipo</span>
          <select
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
            value={value.type}
            onChange={(e) => set({ type: e.target.value as 'PERCENT' | 'FIXED' })}
          >
            <option value="PERCENT">Porcentaje</option>
            <option value="FIXED">Valor fijo</option>
          </select>
        </label>
        <Input
          label={value.type === 'PERCENT' ? 'Porcentaje' : 'Valor $'}
          type="number"
          value={value.value}
          onChange={(e) => set({ value: e.target.value })}
        />
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-text-muted">Vigencia</span>
        <select
          className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          value={value.validityMode}
          onChange={(e) =>
            set({ validityMode: e.target.value as 'DATE_RANGE' | 'WEEKLY_RECURRING' })
          }
        >
          <option value="DATE_RANGE">Rango de fechas</option>
          <option value="WEEKLY_RECURRING">Recurrente semanal</option>
        </select>
      </label>
      {value.validityMode === 'DATE_RANGE' ? (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Desde"
            type="date"
            value={value.validFrom}
            onChange={(e) => set({ validFrom: e.target.value })}
          />
          <Input
            label="Hasta"
            type="date"
            value={value.validTo}
            onChange={(e) => set({ validTo: e.target.value })}
          />
        </div>
      ) : (
        <label className="block text-sm">
          <span className="mb-1 block text-text-muted">Día</span>
          <select
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
            value={value.validWeekday}
            onChange={(e) => set({ validWeekday: e.target.value as GastroWeekday | '' })}
          >
            <option value="">Seleccionar…</option>
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {GASTRO_WEEKDAY_LABELS_ES[d]}
              </option>
            ))}
          </select>
        </label>
      )}
      <Input
        label="Imagen (HTTPS, opcional)"
        value={value.imageUrl}
        onChange={(e) => set({ imageUrl: e.target.value })}
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Guardando…' : submitLabel}
      </Button>
    </form>
  );
}
