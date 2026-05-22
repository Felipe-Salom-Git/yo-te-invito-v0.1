'use client';

import type { ReactNode } from 'react';
import { ProducerEventFormPreview } from './ProducerEventFormPreview';
import type { EventFormData } from '@/lib/schemas/event';
import type { LocationValue } from '@/components/location';

type Props = {
  children: ReactNode;
  form: EventFormData;
  location: LocationValue;
  modeLabel?: string;
  footer: ReactNode;
};

export function ProducerEventFormLayout({
  children,
  form,
  location,
  modeLabel,
  footer,
}: Props) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,280px)] lg:items-start">
      <div className="min-w-0 space-y-6">
        {children}
        {footer}
      </div>
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">
        <ProducerEventFormPreview
          form={form}
          location={location}
          modeLabel={modeLabel}
        />
      </aside>
    </div>
  );
}
