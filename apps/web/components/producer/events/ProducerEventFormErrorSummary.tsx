'use client';

import { PRODUCER_EVENT_FIELD_LABELS } from '@/lib/producer/producer-event-form.utils';

type Props = {
  errors: Record<string, string>;
  formError?: string | null;
};

export function ProducerEventFormErrorSummary({ errors, formError }: Props) {
  const entries = Object.entries(errors).filter(([, msg]) => msg);
  if (!entries.length && !formError) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
    >
      <p className="font-medium text-red-100">
        Revisá los campos marcados antes de guardar.
      </p>
      {formError ? <p className="mt-2">{formError}</p> : null}
      {entries.length > 0 ? (
        <ul className="mt-2 list-inside list-disc space-y-1 text-red-200/90">
          {entries.map(([key, msg]) => (
            <li key={key}>
              <span className="font-medium">
                {PRODUCER_EVENT_FIELD_LABELS[key] ?? key}:
              </span>{' '}
              {msg}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
