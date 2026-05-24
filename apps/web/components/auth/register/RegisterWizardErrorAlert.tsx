'use client';

import { useEffect, useRef } from 'react';

type Props = {
  message: string;
  className?: string;
};

/** Global step error — receives focus for screen readers and keyboard users. */
export function RegisterWizardErrorAlert({ message, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [message]);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      data-register-error-summary
      role="alert"
      className={`rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400 outline-none ${className}`.trim()}
    >
      {message}
    </div>
  );
}
