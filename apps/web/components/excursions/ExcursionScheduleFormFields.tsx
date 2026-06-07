'use client';

import { Input } from '@/components';
import type { ExcursionScheduleInput } from '@yo-te-invito/shared';

export type ExcursionScheduleFormValue = {
  departureTime: string;
  durationText: string;
  availableDaysText: string;
  scheduleNotes: string;
  meetingPoint: string;
};

export const emptyExcursionScheduleFormValue = (): ExcursionScheduleFormValue => ({
  departureTime: '',
  durationText: '',
  availableDaysText: '',
  scheduleNotes: '',
  meetingPoint: '',
});

export function excursionScheduleFormValueFromEvent(
  schedule?: ExcursionScheduleInput | null,
): ExcursionScheduleFormValue {
  return {
    departureTime: schedule?.departureTime ?? '',
    durationText: schedule?.durationText ?? '',
    availableDaysText: schedule?.availableDaysText ?? '',
    scheduleNotes: schedule?.scheduleNotes ?? '',
    meetingPoint: schedule?.meetingPoint ?? '',
  };
}

export function excursionScheduleFormValueToPayload(
  value: ExcursionScheduleFormValue,
): ExcursionScheduleInput {
  return {
    departureTime: value.departureTime.trim() || null,
    durationText: value.durationText.trim() || null,
    availableDaysText: value.availableDaysText.trim() || null,
    scheduleNotes: value.scheduleNotes.trim() || null,
    meetingPoint: value.meetingPoint.trim() || null,
  };
}

type ExcursionScheduleFormFieldsProps = {
  value: ExcursionScheduleFormValue;
  onChange: (value: ExcursionScheduleFormValue) => void;
  disabled?: boolean;
};

export function ExcursionScheduleFormFields({
  value,
  onChange,
  disabled,
}: ExcursionScheduleFormFieldsProps) {
  const set = (patch: Partial<ExcursionScheduleFormValue>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold text-text">Horarios y punto de encuentro</h3>
        <p className="mt-1 text-xs text-text-muted">
          Campos de texto simples. Si no cargás horarios, el detalle público no mostrará esta sección.
        </p>
      </div>
      <Input
        label="Horario de salida"
        value={value.departureTime}
        onChange={(e) => set({ departureTime: e.target.value })}
        placeholder="Ej. 08:30 hs"
        disabled={disabled}
      />
      <Input
        label="Duración"
        value={value.durationText}
        onChange={(e) => set({ durationText: e.target.value })}
        placeholder="Ej. 4 horas"
        disabled={disabled}
      />
      <Input
        label="Días disponibles"
        value={value.availableDaysText}
        onChange={(e) => set({ availableDaysText: e.target.value })}
        placeholder="Ej. Lunes a viernes, todo el año"
        disabled={disabled}
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Punto de encuentro / salida</label>
        <textarea
          value={value.meetingPoint}
          onChange={(e) => set({ meetingPoint: e.target.value })}
          rows={2}
          placeholder="Ej. Oficina del operador en Mitre 123 o parada del colectivo en…"
          disabled={disabled}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-text disabled:opacity-50"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Observaciones de horario</label>
        <textarea
          value={value.scheduleNotes}
          onChange={(e) => set({ scheduleNotes: e.target.value })}
          rows={2}
          placeholder="Ej. Confirmar con 24 h de anticipación. Horarios sujetos a clima."
          disabled={disabled}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-text disabled:opacity-50"
        />
      </div>
    </div>
  );
}
