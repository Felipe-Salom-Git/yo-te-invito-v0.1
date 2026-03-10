'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

export default function ReventaListingPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const listingId = (params?.listingId as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();

  const { data: listing, isLoading } = useQuery({
    queryKey: ['resale', listingId],
    queryFn: () => repos.resale.get(listingId),
    enabled: !!listingId,
  });

  const { data: event } = useQuery({
    queryKey: ['events', 'detail', listing?.eventId],
    queryFn: () => repos.events.getDetail(listing!.eventId, 'tenant-demo'),
    enabled: !!listing?.eventId,
  });

  const purchaseMutation = useMutation({
    mutationFn: () => {
      const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id;
      if (!userId) throw new Error('Debés iniciar sesión para comprar');
      return repos.resale.purchase(listingId, userId);
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resale'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      router.push('/me/tickets');
    },
  });

  if (isLoading || !listing) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (listing.status !== 'ACTIVE') {
    return (
      <PageContainer>
        <SectionTitle>Listing no disponible</SectionTitle>
        <p className="mt-2 text-text-muted">Esta entrada ya fue vendida o cancelada.</p>
        <Link href="/home" className="mt-4 inline-block text-accent hover:underline">
          Volver al inicio
        </Link>
      </PageContainer>
    );
  }

  const priceFormatted = `$${(listing.askingPriceCents / 100).toLocaleString('es-AR')}`;
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id;

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Inicio
      </Link>

      <div className="rounded-lg border border-border bg-bg-muted p-6">
        <h1 className="text-xl font-semibold text-text">Reventa oficial</h1>
        {event && (
          <Link
            href={`/events/${event.id}`}
            className="mt-2 block text-lg text-accent hover:underline"
          >
            {event.title}
          </Link>
        )}
        <p className="mt-2 text-text-muted">
          {event?.city ?? event?.venueName ?? '—'} ·{' '}
          {event?.startAt ? new Date(event.startAt).toLocaleDateString() : '—'}
        </p>

        <div className="mt-6 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-accent">{priceFormatted}</span>
          <span className="text-sm text-text-muted">ARS</span>
        </div>

        <p className="mt-4 text-sm text-text-muted">
          1 entrada · Reventa oficial
        </p>

        {status === 'loading' ? (
          <p className="mt-6 text-text-muted">Cargando sesión…</p>
        ) : !userId ? (
          <div className="mt-6">
            <p className="text-text-muted">Iniciá sesión para comprar.</p>
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/reventa/${listingId}`)}`}>
              <Button className="mt-4">Iniciar sesión</Button>
            </Link>
          </div>
        ) : (
          <Button
            className="mt-6"
            onClick={() => purchaseMutation.mutate()}
            disabled={purchaseMutation.isPending}
          >
            {purchaseMutation.isPending ? 'Comprando…' : 'Comprar'}
          </Button>
        )}

        {purchaseMutation.isError && (
          <p className="mt-4 text-sm text-red-500">
            {(purchaseMutation.error as Error).message}
          </p>
        )}
      </div>
    </PageContainer>
  );
}
