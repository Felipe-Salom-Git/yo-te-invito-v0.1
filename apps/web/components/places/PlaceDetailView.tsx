'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useCart } from '@/context/CartContext';
import { useEventDetail, eventsKeys } from '@/lib/query/events';
import { reviewsKeys } from '@/lib/query/keys';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { EntityType } from '@/lib/schemas/review';

export type PlaceVariant = 'restaurant' | 'excursion' | 'rental';

const CATEGORY_TO_ENTITY: Record<PlaceVariant, EntityType> = {
  restaurant: 'restaurant',
  excursion: 'excursion',
  rental: 'rental',
};

export type PlaceDetailViewProps = {
  id: string;
  variant: PlaceVariant;
  tenantId?: string;
};

export function PlaceDetailView({ id, variant, tenantId = 'tenant-demo' }: PlaceDetailViewProps) {
  const { data: session } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { addToast } = useToast();

  const { data: event, isLoading, error } = useEventDetail(id, tenantId);

  const { data: ticketTypes } = useQuery({
    queryKey: ['ticketTypes', id],
    queryFn: () => repos.events.getTicketTypes(id),
    enabled: !!id && !!event?.isTicketingEnabled,
  });

  const { data: reviewsData } = useQuery({
    queryKey: reviewsKeys.byEvent(id, tenantId, 1),
    queryFn: () => repos.reviews.list(id, tenantId, 1, 10),
    enabled: !!id && !!tenantId,
  });

  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? 'demo-user';
  const createMutation = useMutation({
    mutationFn: (payload: { score: number; comment?: string }) =>
      repos.reviews.create(id, { score: payload.score, comment: payload.comment }, userId),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(id, tenantId) });
      queryClient.invalidateQueries({ queryKey: reviewsKeys.byEvent(id, tenantId) });
    },
  });

  const handleSubmitReview = (values: { score: number; comment?: string }) => {
    createMutation.mutate(values);
  };

  if (isLoading || !id) {
    return (
      <div className="p-8">
        <p className="text-text-muted">Cargando…</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-8">
        <p className="text-red-400">No encontrado</p>
        <Link href="/home" className="mt-4 block text-accent hover:underline">
          ← Volver
        </Link>
      </div>
    );
  }

  const entityType = CATEGORY_TO_ENTITY[variant];
  const whatsappNumber = '5491112345678';
  const whatsappText = encodeURIComponent(`Hola, me interesa ${event.title}`);

  return (
    <div>
      <div className="relative h-48 w-full overflow-hidden bg-black sm:h-64 md:h-80">
        {event.coverImageUrl ? (
          <img src={event.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl text-white/20">
            {variant === 'restaurant' ? '🍽️' : variant === 'excursion' ? '🥾' : '🏠'}
          </div>
        )}
      </div>

      <div className="p-4 md:p-8">
        <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-text md:text-3xl">{event.title}</h1>
        <div className="mt-4 flex gap-4 text-sm text-text-muted">
          {event.venueName && <span>{event.venueName}</span>}
          {event.city && <span>{event.city}</span>}
          <span>{new Date(event.startAt).toLocaleDateString('es-AR')}</span>
        </div>
        {event.description && <p className="mt-4 text-text-muted">{event.description}</p>}

        {(event.ratingAvg != null || event.ratingCount) && (
          <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
            {event.ratingAvg != null && (
              <span className="font-medium">★ {event.ratingAvg.toFixed(1)}</span>
            )}
            {event.ratingCount != null && event.ratingCount > 0 && (
              <span>({event.ratingCount} reseñas)</span>
            )}
          </div>
        )}

        {/* CTA por variante */}
        <section className="mt-8 rounded-lg border border-border bg-bg-muted p-6">
          <h2 className="text-lg font-semibold text-text">
            {variant === 'restaurant' && 'Reservar o solicitar código'}
            {variant === 'excursion' && 'Más información'}
            {variant === 'rental' && 'Consultar disponibilidad'}
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            {variant === 'restaurant' &&
              'Solicitá tu código de descuento o hacé tu reserva.'}
            {(variant === 'excursion' || variant === 'rental') &&
              'Contactanos por WhatsApp para coordinar.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {variant === 'restaurant' && (
              <Link
                href={`/events/${id}?tenantId=${tenantId}`}
                className="rounded bg-accent px-4 py-2 text-bg hover:bg-accent-hover"
              >
                Ver entradas y reservar
              </Link>
            )}
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-emerald-500 px-4 py-2 text-emerald-400 hover:bg-emerald-500/10"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </section>

        {event.isTicketingEnabled && ticketTypes && ticketTypes.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-text">Entradas</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ticketTypes.map((tt) => (
                <div
                  key={tt.id}
                  className="rounded-lg border border-border bg-bg-muted p-4"
                >
                  <h3 className="font-medium text-text">{tt.name}</h3>
                  <p className="mt-1 text-accent">
                    ${typeof tt.price === 'string' ? tt.price : tt.price}
                  </p>
                  <p className="text-xs text-text-muted">
                    {tt.capacityAvailable} disponibles
                  </p>
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() =>
                      addItem({
                        eventId: id,
                        eventTitle: event.title ?? 'Event',
                        ticketTypeId: tt.id,
                        ticketTypeName: tt.name,
                        price: typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price,
                        quantity: 1,
                        maxPerOrder: Math.min(10, tt.capacityAvailable),
                      })
                    }
                  >
                    Agregar al carrito
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-4">
              <Link
                href={`/checkout/${id}?tenantId=${tenantId}`}
                className="rounded bg-accent px-4 py-2 text-bg hover:bg-accent-hover"
              >
                Comprar directo
              </Link>
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-text">Reseñas</h2>
          <div className="mt-4 space-y-4">
            {reviewsData?.reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-border bg-bg-muted p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-amber-400">★ {r.score}</span>
                  <span className="text-sm text-text-muted">{r.userName}</span>
                  <span className="text-xs text-text-muted/70">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {r.title && <p className="mt-1 font-medium">{r.title}</p>}
                {r.comment && <p className="mt-1 text-text-muted">{r.comment}</p>}
              </div>
            ))}
          </div>
          <div className="mt-6">
            <ReviewForm
              entityType={entityType}
              entityId={id}
              onSubmit={handleSubmitReview}
              isSubmitting={createMutation.isPending}
            />
            {createMutation.error && (
              <p className="mt-2 text-sm text-red-400">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Error'}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
