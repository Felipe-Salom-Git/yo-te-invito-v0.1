'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEventDetail, eventsKeys } from '@/lib/query/events';
import { useRepositories } from '@/repositories/context';
import { useCart } from '@/context/CartContext';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { reviewsKeys } from '@/lib/query/keys';
import type { EntityType } from '@/lib/schemas/review';

const DEFAULT_TENANT_ID = 'tenant-demo';

const CATEGORY_TO_ENTITY: Record<string, EntityType> = {
  gastro: 'restaurant',
  event: 'event',
  excursion: 'excursion',
  rental: 'rental',
};

export default function EventDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const eventId = (params?.eventId as string) ?? '';
  const tenantId = searchParams?.get('tenantId') ?? DEFAULT_TENANT_ID;
  const [reviewPage, setReviewPage] = useState(1);
  const [qtyByType, setQtyByType] = useState<Record<string, number>>({});

  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { addToast } = useToast();

  const { data: event, isLoading, error } = useEventDetail(eventId, tenantId);

  const { data: ticketTypes } = useQuery({
    queryKey: ['ticketTypes', eventId],
    queryFn: () => repos.events.getTicketTypes(eventId),
    enabled: !!eventId && !!event?.isTicketingEnabled,
  });

  const { data: reviewsData } = useQuery({
    queryKey: reviewsKeys.byEvent(eventId, tenantId, reviewPage),
    queryFn: () => repos.reviews.list(eventId, tenantId, reviewPage, 10),
    enabled: !!eventId && !!tenantId,
  });

  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? 'demo-user';
  const createMutation = useMutation({
    mutationFn: (payload: { score: number; comment?: string }) =>
      repos.reviews.create(eventId, { score: payload.score, comment: payload.comment }, userId),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId, tenantId) });
      queryClient.invalidateQueries({ queryKey: reviewsKeys.byEvent(eventId, tenantId) });
    },
  });

  const entityType = CATEGORY_TO_ENTITY[event?.category ?? 'event'] ?? 'event';

  const handleSubmitReview = (values: { score: number; comment?: string }) => {
    createMutation.mutate(values);
  };

  const handleAddToCart = (tt: { id: string; name: string; price: string | number; capacityAvailable: number }) => {
    const qty = qtyByType[tt.id] ?? 1;
    if (qty < 1) return;
    addItem({
      eventId,
      eventTitle: event?.title ?? 'Event',
      ticketTypeId: tt.id,
      ticketTypeName: tt.name,
      price: typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price,
      quantity: qty,
      maxPerOrder: Math.min(10, tt.capacityAvailable),
    });
    setQtyByType((p) => ({ ...p, [tt.id]: 0 }));
  };

  if (isLoading || !eventId) {
    return (
      <div className="p-8">
        <p className="text-text-muted">Loading…</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-8">
        <p className="text-red-400">Event not found</p>
        <Link href="/home" className="mt-4 block text-accent hover:underline">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Event banner */}
      <div className="relative h-48 w-full overflow-hidden bg-black sm:h-64 md:h-80">
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl text-white/20">
            📅
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
            <span>({event.ratingCount} reviews)</span>
          )}
        </div>
      )}

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
                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={Math.min(10, tt.capacityAvailable)}
                    value={qtyByType[tt.id] ?? 0}
                    onChange={(e) =>
                      setQtyByType((p) => ({
                        ...p,
                        [tt.id]: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-16 rounded border border-border bg-bg px-2 py-1 text-text"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(tt)}
                    disabled={(qtyByType[tt.id] ?? 0) < 1}
                  >
                    Agregar al carrito
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              href="/checkout"
              className="rounded bg-accent px-4 py-2 text-bg hover:bg-accent-hover"
            >
              Ir al carrito
            </Link>
            <Link
              href={`/checkout/${eventId}?tenantId=${tenantId}`}
              className="rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10"
            >
              Comprar directo
            </Link>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">Reviews</h2>
        <div className="mt-4 space-y-4">
          {reviewsData?.reviews.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-bg-muted p-4">
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

        {reviewsData && reviewsData.total > 10 && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
              disabled={reviewPage <= 1}
              className="rounded border border-border bg-bg-muted px-3 py-1 text-sm disabled:opacity-50 hover:bg-border"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setReviewPage((p) => p + 1)}
              disabled={reviewPage * 10 >= reviewsData.total}
              className="rounded border border-border bg-bg-muted px-3 py-1 text-sm disabled:opacity-50 hover:bg-border"
            >
              Next
            </button>
          </div>
        )}

        <div className="mt-6">
          <ReviewForm
            entityType={entityType}
            entityId={eventId}
            onSubmit={handleSubmitReview}
            isSubmitting={createMutation.isPending}
          />
          {createMutation.error && (
            <p className="mt-2 text-sm text-red-400">
              {createMutation.error instanceof Error ? createMutation.error.message : 'Error'}
            </p>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
