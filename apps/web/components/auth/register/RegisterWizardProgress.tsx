'use client';

import type { RegisterWizardStepKey } from './register-wizard-copy';

type Props = {
  steps: { key: RegisterWizardStepKey; label: string }[];
  currentStep: RegisterWizardStepKey;
};

export function RegisterWizardProgress({ steps, currentStep }: Props) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <nav aria-label="Progreso del registro" className="mb-6 min-w-0">
      <ol className="-mx-1 flex min-w-0 items-start justify-between gap-0.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const active = step.key === currentStep;
          const statusLabel = done ? 'completado' : active ? 'actual' : 'pendiente';
          return (
            <li
              key={step.key}
              className="flex min-w-[4.25rem] max-w-[5.5rem] flex-1 flex-col items-center gap-1 sm:min-w-0 sm:max-w-none"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-8 sm:w-8 ${
                  active
                    ? 'bg-accent text-bg'
                    : done
                      ? 'bg-accent/20 text-accent'
                      : 'bg-bg-muted text-text-muted'
                }`}
                aria-current={active ? 'step' : undefined}
                title={`${step.label} (${statusLabel})`}
              >
                {done ? '✓' : index + 1}
              </span>
              <span
                className={`w-full truncate px-0.5 text-center text-[10px] leading-tight sm:text-xs ${
                  active ? 'font-medium text-text' : 'text-text-muted'
                }`}
                title={step.label}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
