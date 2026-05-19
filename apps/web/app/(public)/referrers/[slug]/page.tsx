'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { PageContainer } from '@/components';

export default function PublicReferrerBySlugPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const { tenantId } = useTenant();
  const repos = useRepositories();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public', 'referrer', 'slug', tenantId, slug],
    queryFn: () => repos.profiles.getPublicReferrerBySlug(tenantId, slug),
    enabled: !!slug,
  });

  if (!slug) {
    return (
      <PageContainer>
        <p className="text-text-muted">No encontrado.</p>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer className="max-w-lg py-16">
        <h1 className="text-xl font-semibold text-text">Perfil no encontrado</h1>
        <Link href="/referrers" className="mt-4 inline-block text-accent hover:underline">
          ← Directorio
        </Link>
      </PageContainer>
    );
  }

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-bg to-bg-muted/30">
      <PageContainer className="max-w-2xl py-10">
        <Link href="/referrers" className="text-sm text-text-muted hover:text-accent">
          ← Directorio
        </Link>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-bg-muted text-3xl font-semibold text-accent">
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              data.displayName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-text">{data.displayName}</h1>
            <p className="mt-2 text-sm text-text-muted">
              Score {data.salesScore ?? '—'} · {data.completedSales} ventas ·{' '}
              {[data.city, data.region].filter(Boolean).join(', ') || '—'}
            </p>
            {data.bio && <p className="mt-4 text-text">{data.bio}</p>}
            {data.longBio && <p className="mt-4 whitespace-pre-wrap text-sm text-text-muted">{data.longBio}</p>}
          </div>
        </div>

        {data.coverImageUrl && (
          <div className="mt-10 overflow-hidden rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.coverImageUrl} alt="" className="max-h-64 w-full object-cover" />
          </div>
        )}

        <div className="mt-10 rounded-xl border border-accent/25 bg-bg-muted/50 p-5">
          <p className="text-sm text-text">
            Para asociarte pedí al referidor su <strong>link personal de asociación</strong> (distinto del link de venta
            de entradas).
          </p>
        </div>
      </PageContainer>
    </div>
  );
}
