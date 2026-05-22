import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  status?: 'complete' | 'incomplete';
  children?: ReactNode;
  footer?: ReactNode;
};

export function ProducerProfileBlockCard({
  icon,
  title,
  description,
  status,
  children,
  footer,
}: Props) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/80 bg-bg-muted/60 p-5 shadow-sm transition-colors hover:border-accent-muted/50">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg text-accent-soft">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-semibold text-text">{title}</h3>
            {status ? (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  status === 'complete'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/25 bg-amber-500/10 text-amber-200/90'
                }`}
              >
                {status === 'complete' ? 'Completo' : 'Pendiente'}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-snug text-text-muted">{description}</p>
        </div>
      </div>
      {children ? <div className="mt-4 min-h-[3rem] flex-1">{children}</div> : null}
      {footer ? <footer className="mt-4">{footer}</footer> : null}
    </article>
  );
}
