'use client';

import type { TicketTypeBatchValidationError } from '@/lib/producer/ticket-type-batches.validation';

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre del tipo',
  capacityTotal: 'Capacidad total',
  batches: 'Tandas',
};

type Props = {
  error: TicketTypeBatchValidationError | null;
  formError?: string | null;
};

export function ProducerTicketFormErrorSummary({ error, formError }: Props) {
  if (!error && !formError) return null;

  const fieldEntries = error ? Object.entries(error.fieldErrors) : [];

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
    >
      <p className="font-medium text-red-100">
        {error?.message ?? formError ?? 'Revisá el formulario antes de guardar.'}
      </p>
      {formError && error ? <p className="mt-2">{formError}</p> : null}
      {fieldEntries.length > 0 ? (
        <ul className="mt-2 list-inside list-disc space-y-1">
          {fieldEntries.map(([key, msg]) => (
            <li key={key}>
              <span className="font-medium">{FIELD_LABELS[key] ?? key}:</span> {msg}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
