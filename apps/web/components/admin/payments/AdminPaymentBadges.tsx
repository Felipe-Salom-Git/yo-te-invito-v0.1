'use client';

const providerStyles: Record<string, string> = {
  GETNET: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  DEMO: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  MERCADOPAGO: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

const statusStyles: Record<string, string> = {
  APPROVED: 'bg-accent/15 text-accent border-accent/40',
  PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
  CANCELLED: 'bg-border text-text-muted border-border',
  EXPIRED: 'bg-border text-text-muted border-border',
};

export function AdminPaymentProviderBadge({ provider }: { provider: string }) {
  const cls = providerStyles[provider] ?? 'bg-bg-muted text-text-muted border-border';
  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {provider}
    </span>
  );
}

export function AdminPaymentStatusBadge({ status }: { status: string }) {
  const cls = statusStyles[status] ?? 'bg-bg-muted text-text-muted border-border';
  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function AdminManualReviewBadge() {
  return (
    <span className="inline-flex rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-200">
      Requiere revisión
    </span>
  );
}
