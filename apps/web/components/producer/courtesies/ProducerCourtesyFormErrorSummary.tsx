'use client';

const FIELD_LABELS: Record<string, string> = {
  quantity: 'Cantidad',
  ticketTypeId: 'Tipo de entrada',
  mode: 'Modo',
};

type Props = {
  message: string | null;
  fieldErrors?: Record<string, string>;
};

export function ProducerCourtesyFormErrorSummary({ message, fieldErrors = {} }: Props) {
  const entries = Object.entries(fieldErrors).filter(([, v]) => v);
  if (!message && entries.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
    >
      {message ? <p className="font-medium text-red-100">{message}</p> : null}
      {entries.length > 0 ? (
        <ul className={`${message ? 'mt-2' : ''} list-inside list-disc space-y-1`}>
          {entries.map(([key, msg]) => (
            <li key={key}>
              <span className="font-medium">{FIELD_LABELS[key] ?? key}:</span> {msg}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
