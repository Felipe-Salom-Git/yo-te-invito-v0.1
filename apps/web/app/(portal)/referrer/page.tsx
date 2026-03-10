'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Card, CardContent } from '@/components';

export default function ReferrerPortalPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const { data: linksData } = useQuery({
    queryKey: ['referrals', 'user', userId],
    queryFn: () => repos.referrals.listLinksByUser(userId),
    enabled: !!userId && status === 'authenticated',
  });

  const links = linksData?.links ?? [];
  const totalAttributed = links.reduce((s, l) => s + (l.attributedOrdersCount ?? 0), 0);
  const commission = totalAttributed * 50; // fake: $50 per attributed order

  if (status === 'loading') return <PageContainer><p className="text-text-muted">Loading…</p></PageContainer>;
  if (!session?.user) return <PageContainer><p className="text-text-muted">Iniciar sesión</p><Link href="/login" className="text-accent">Login</Link></PageContainer>;

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">← Volver</Link>
      <SectionTitle>Portal Referrer</SectionTitle>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Ventas atribuidas</p>
            <p className="text-2xl font-bold text-text">{totalAttributed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Comisión (demo)</p>
            <p className="text-2xl font-bold text-accent">${commission}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Links activos</p>
            <p className="text-2xl font-bold text-text">{links.length}</p>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="font-semibold text-text">Mis links de referral</h2>
        {links.length === 0 ? (
          <p className="mt-4 text-text-muted">Sin links. Creá links desde la página de eventos del productor.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {links.map((l) => (
              <li key={l.id} className="flex items-center justify-between rounded border border-border bg-bg-muted p-4">
                <div>
                  <span className="font-medium text-text">{l.code}</span>
                  {l.label && <span className="ml-2 text-text-muted">— {l.label}</span>}
                </div>
                <span className="rounded bg-border px-2 py-0.5 text-sm">{l.attributedOrdersCount} ventas</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
