'use client';

import type { ProducerEventWizardStep } from '@/lib/producer/producer-event-wizard';
import { PRODUCER_EVENT_WIZARD_STEPS } from '@/lib/producer/producer-event-wizard';

type Props = {
  currentStep: ProducerEventWizardStep;
};

export function ProducerEventWizardProgress({ currentStep }: Props) {
  const currentIndex = PRODUCER_EVENT_WIZARD_STEPS.findIndex((s) => s.step === currentStep);

  return (
    <nav aria-label="Progreso del formulario" className="mb-6 min-w-0">
      <ol className="-mx-1 flex min-w-0 items-start justify-between gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {PRODUCER_EVENT_WIZARD_STEPS.map(({ step, label }, index) => {
          const done = index < currentIndex;
          const active = step === currentStep;
          return (
            <li
              key={step}
              className="flex min-w-[5rem] flex-1 flex-col items-center gap-1 sm:min-w-0"
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
              >
                {done ? '✓' : step}
              </span>
              <span
                className={`w-full truncate px-0.5 text-center text-[10px] leading-tight sm:text-xs ${
                  active ? 'font-medium text-text' : 'text-text-muted'
                }`}
                title={label}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
