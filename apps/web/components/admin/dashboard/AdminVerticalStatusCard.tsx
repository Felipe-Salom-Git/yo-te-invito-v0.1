import Link from 'next/link';

type AdminVerticalStatusCardProps = {
  title: string;
  description: string;
  comingSoon?: boolean;
  href?: string;
  ctaLabel?: string;
};

/** Vertical access tile — active links or “Próximamente” (e.g. hoteles). */
export function AdminVerticalStatusCard({
  title,
  description,
  comingSoon,
  href,
  ctaLabel = 'Ir →',
}: AdminVerticalStatusCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        comingSoon
          ? 'border-dashed border-white/15 bg-white/[0.03]'
          : 'border-border/80 bg-bg-muted/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-text">{title}</p>
        {comingSoon ? (
          <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
            Próximamente
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-text-muted">{description}</p>
      {!comingSoon && href ? (
        <Link href={href} className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
