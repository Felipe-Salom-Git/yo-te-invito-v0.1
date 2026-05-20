import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
  footer?: ReactNode;
};

export function ProducerProfileBlockCard({ icon, title, description, children, footer }: Props) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/80 bg-bg-muted/60 p-5 shadow-sm transition-colors hover:border-accent-muted/50">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg text-accent-soft">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-text">{title}</h3>
          <p className="mt-1 text-sm leading-snug text-text-muted">{description}</p>
        </div>
      </div>
      {children ? <div className="mt-4 min-h-[3rem] flex-1">{children}</div> : null}
      {footer ? <footer className="mt-4">{footer}</footer> : null}
    </article>
  );
}
