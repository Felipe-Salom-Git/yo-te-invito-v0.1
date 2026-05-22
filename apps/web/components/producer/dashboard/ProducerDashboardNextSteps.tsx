'use client';

import Link from 'next/link';

export type ProducerNextStep = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

type Props = {
  steps: ProducerNextStep[];
};

export function ProducerDashboardNextSteps({ steps }: Props) {
  if (steps.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="producer-next-steps-heading">
      <h2 id="producer-next-steps-heading" className="text-lg font-semibold text-text">
        Próximos pasos recomendados
      </h2>
      <ul className="mt-3 space-y-3">
        {steps.map((step) => (
          <li
            key={step.href + step.title}
            className="flex flex-col gap-3 rounded-xl border border-border/80 bg-bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-text">{step.title}</p>
              <p className="mt-0.5 text-sm text-text-muted">{step.description}</p>
            </div>
            <Link
              href={step.href}
              className="shrink-0 rounded border border-accent px-4 py-2 text-center text-sm font-medium text-accent transition-colors hover:bg-accent/10"
            >
              {step.cta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
