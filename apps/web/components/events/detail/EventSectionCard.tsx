'use client';

import type { ReactNode } from 'react';

type Props = {
  title?: string;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function EventSectionCard({ title, children, className = '', id }: Props) {
  return (
    <section
      id={id}
      className={`rounded-xl border border-border bg-bg-muted p-4 sm:p-5 ${className}`}
    >
      {title ? (
        <h2 className="text-lg font-semibold text-text">{title}</h2>
      ) : null}
      <div className={title ? 'mt-3' : ''}>{children}</div>
    </section>
  );
}
