'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';

export default function ReferrerEventosPage() {
  const { data: session } = useSession();
  const repos = useRepositories();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const { data: linksData } = useQuery({
    queryKey: ['referrals', 'user', userId],
    queryFn: () => repos.referrals.listLinksByUser(userId),
    enabled: !!userId,
  });

  const links = linksData?.links ?? [];
  const eventIds = [...new Set(links.map((l) => l.eventId).filter(Boolean))] as string[];

  return (
    <PageContainer>
      <Link href="/referrer" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <SectionTitle>Eventos asignados</SectionTitle>
      <p className="mt-2 text-text-muted">
        Eventos con links de referral asignados. Ver ventas y solicitar comisión por evento.
      </p>

      {links.length === 0 ? (
        <p className="mt-6 text-text-muted">
          Sin eventos asignados. La productora debe asignarte links desde su panel de referidos.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {eventIds.map((eventId) => {
            const eventLinks = links.filter((l) => l.eventId === eventId);
            const totalSales = eventLinks.reduce((s, l) => s + (l.attributedOrdersCount ?? 0), 0);
            const commissionCents = totalSales * 5000;
            return (
              <li key={eventId}>
                <Link
                  href={`/referrer/eventos/${eventId}`}
                  className="block rounded-lg border border-border bg-bg-muted p-4 transition-colors hover:border-accent"
                >
                  <span className="font-medium text-text">Evento {eventId}</span>
                  <p className="mt-1 text-sm text-text-muted">
                    {totalSales} ventas atribuidas · ${(commissionCents / 100).toLocaleString('es-AR')} comisión
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {eventLinks.length} link(s): {eventLinks.map((l) => l.code).join(', ')}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
