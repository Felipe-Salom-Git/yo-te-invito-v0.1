import type { EventFormData } from '@/lib/schemas/event';
import type { LocationValue } from '@/components/location';
import { PUBLIC_SUMMARY_MAX_LENGTH } from '@yo-te-invito/shared';
import { zodErrorsToFieldMap } from './producer-event-form.utils';
import { eventFormSchema } from '@/lib/schemas/event';

export type ProducerEventWizardStep = 1 | 2 | 3;

export const PRODUCER_EVENT_WIZARD_STEPS: { step: ProducerEventWizardStep; label: string }[] = [
  { step: 1, label: 'Datos' },
  { step: 2, label: 'Fecha y lugar' },
  { step: 3, label: 'Imagen y envío' },
];

export function validateProducerEventWizardStep1(
  form: EventFormData,
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!form.title.trim()) {
    errors.title = 'El título es obligatorio.';
  }
  if (form.summary && form.summary.length > PUBLIC_SUMMARY_MAX_LENGTH) {
    errors.summary = `Máximo ${PUBLIC_SUMMARY_MAX_LENGTH} caracteres.`;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true };
}

export function validateProducerEventWizardStep2(
  form: EventFormData,
  location: LocationValue,
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const parsed = eventFormSchema.safeParse(form);
  if (!parsed.success) {
    const all = zodErrorsToFieldMap(parsed.error);
    const errors: Record<string, string> = {};
    for (const key of ['startAt', 'endAt', 'venueName', 'capacityTotal'] as const) {
      if (all[key]) errors[key] = all[key]!;
    }
    if (Object.keys(errors).length > 0) return { ok: false, errors };
  } else if (parsed.data.endAt && parsed.data.startAt) {
    if (new Date(parsed.data.endAt) < new Date(parsed.data.startAt)) {
      return { ok: false, errors: { endAt: 'La fecha de fin debe ser posterior al inicio.' } };
    }
  }
  if (!form.startAt) {
    return { ok: false, errors: { startAt: 'La fecha de inicio es obligatoria.' } };
  }
  void location;
  return { ok: true };
}
