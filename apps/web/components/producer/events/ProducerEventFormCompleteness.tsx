'use client';

import type { EventFormCompletenessItem } from '@/lib/producer/producer-event-form.utils';

type Props = {
  items: EventFormCompletenessItem[];
};

export function ProducerEventFormCompleteness({ items }: Props) {
  const required = items.filter((i) => i.id !== 'subcategory');
  const doneCount = required.filter((i) => i.done).length;
  const ready = doneCount === required.length;

  return (
    <div className="rounded-xl border border-border bg-bg-muted p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        Checklist de la ficha
      </p>
      <p className="mt-1 text-sm text-text">
        {doneCount}/{required.length} datos clave
        {ready ? (
          <span className="ml-1 text-accent">— listo para enviar a revisión</span>
        ) : (
          <span className="ml-1 text-text-muted">— completá lo pendiente</span>
        )}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span
              className={
                item.done
                  ? 'mt-0.5 text-accent'
                  : 'mt-0.5 text-text-muted'
              }
              aria-hidden
            >
              {item.done ? '✓' : '○'}
            </span>
            <span className={item.done ? 'text-text-muted line-through' : 'text-text'}>
              {item.label}
              {item.id === 'subcategory' ? (
                <span className="text-text-muted"> (opcional)</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
