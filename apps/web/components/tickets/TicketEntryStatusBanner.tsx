'use client';

import { ticketStatusOverlayLabel } from '@/lib/tickets/ticket-status-ui';

type Props = {
  status: string;
  className?: string;
};

/** Visible on screen and in print (unlike dim overlay hidden from print CSS). */
export function TicketEntryStatusBanner({ status, className = '' }: Props) {
  const label = ticketStatusOverlayLabel(status);
  if (!label) return null;

  return (
    <p
      className={`ticket-entry-status-banner rounded-lg border-2 border-amber-500/60 bg-amber-500/15 px-3 py-2 text-center text-sm font-semibold text-amber-800 print:border-amber-700 print:bg-amber-50 print:text-amber-900 ${className}`}
      role="status"
    >
      {label} — no habilita ingreso
    </p>
  );
}
