import type { Ticket } from '@/repositories/interfaces';

export type PortalTicketBuckets = {
  upcoming: Ticket[];
  pastActive: Ticket[];
  used: Ticket[];
  inactive: Ticket[];
};

/**
 * Groups tickets for /me/tickets: próximos, pasados aún válidos, usados, transferidos/revocados.
 */
export function groupPortalTickets(tickets: Ticket[]): PortalTicketBuckets {
  const now = Date.now();
  const upcoming: Ticket[] = [];
  const pastActive: Ticket[] = [];
  const used: Ticket[] = [];
  const inactive: Ticket[] = [];

  for (const t of tickets) {
    const status = String(t.status);
    if (status === 'USED') {
      used.push(t);
      continue;
    }
    if (status === 'REVOKED' || status === 'TRANSFERRED') {
      inactive.push(t);
      continue;
    }
    const startRaw = t.eventStartAt as string | undefined;
    const startMs = startRaw ? new Date(startRaw).getTime() : null;
    if (startMs != null && startMs < now && status === 'VALID') {
      pastActive.push(t);
    } else {
      upcoming.push(t);
    }
  }

  return { upcoming, pastActive, used, inactive };
}
