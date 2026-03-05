'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchEventDetail } from '@/lib/api/events';
import { fetchReviews, createReview } from '@/lib/api/reviews';

const DEFAULT_TENANT_ID = 'default-tenant';
const REVIEWS_DEV_USER_KEY = 'event:devUserId';

export default function EventDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = (params?.eventId as string) ?? '';
  const tenantId = searchParams?.get('tenantId') ?? DEFAULT_TENANT_ID;
  const [reviewPage, setReviewPage] = useState(1);
  const [devUserId, setDevUserId] = useState('');
  const [score, setScore] = useState(4);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  const queryClient = useQueryClient();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', eventId, tenantId],
    queryFn: () => fetchEventDetail(eventId, tenantId),
    enabled: !!eventId,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', eventId, tenantId, reviewPage],
    queryFn: () => fetchReviews(eventId, tenantId, reviewPage, 10),
    enabled: !!eventId && !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createReview(eventId, { score, title: title || undefined, comment: comment || undefined }, devUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', eventId, tenantId] });
      setTitle('');
      setComment('');
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDevUserId(localStorage.getItem(REVIEWS_DEV_USER_KEY) ?? '');
    }
  }, []);

  const handleDevUserIdChange = (v: string) => {
    setDevUserId(v);
    if (typeof window !== 'undefined') localStorage.setItem(REVIEWS_DEV_USER_KEY, v);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!devUserId) return;
    createMutation.mutate();
  };

  if (isLoading || !eventId) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <p className="text-slate-600">Loading…</p>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <p className="text-red-600">Event not found</p>
        <Link href="/" className="mt-4 block text-slate-600 hover:underline">
          ← Back to events
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <Link href="/" className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900">
        ← Back to events
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">{event.title}</h1>
      <div className="mt-4 flex gap-4 text-sm text-slate-500">
        {event.venueName && <span>{event.venueName}</span>}
        {event.city && <span>{event.city}</span>}
        <span>{new Date(event.startAt).toLocaleDateString('es-AR')}</span>
      </div>
      {event.description && (
        <p className="mt-4 text-slate-700">{event.description}</p>
      )}
      {event.isTicketingEnabled && (
        <p className="mt-4 text-sm text-emerald-600">Tickets available</p>
      )}

      {(event.ratingAvg != null || event.ratingCount) && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          {event.ratingAvg != null && (
            <span className="font-medium">★ {event.ratingAvg.toFixed(1)}</span>
          )}
          {event.ratingCount != null && event.ratingCount > 0 && (
            <span>({event.ratingCount} reviews)</span>
          )}
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-800">Reviews</h2>

        <div className="mt-4 space-y-4">
          {reviewsData?.reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-amber-600">★ {r.score}</span>
                <span className="text-sm text-slate-500">{r.userName}</span>
                <span className="text-xs text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              {r.title && <p className="mt-1 font-medium">{r.title}</p>}
              {r.comment && <p className="mt-1 text-slate-600">{r.comment}</p>}
            </div>
          ))}
        </div>

        {reviewsData && reviewsData.total > 10 && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
              disabled={reviewPage <= 1}
              className="rounded bg-slate-200 px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setReviewPage((p) => p + 1)}
              disabled={(reviewPage * 10) >= reviewsData.total}
              className="rounded bg-slate-200 px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        <form onSubmit={handleSubmitReview} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-medium text-slate-800">Write a review</h3>
          <div>
            <label className="block text-sm text-slate-600">Dev User ID</label>
            <input
              type="text"
              value={devUserId}
              onChange={(e) => handleDevUserIdChange(e.target.value)}
              placeholder="X-Dev-User-Id"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600">Score (1–5)</label>
            <select
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="mt-1 rounded border border-slate-300 px-3 py-2"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          {createMutation.error && (
            <p className="text-sm text-red-600">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : 'Failed'}
            </p>
          )}
          <button
            type="submit"
            disabled={createMutation.isPending || !devUserId}
            className="rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50"
          >
            {createMutation.isPending ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      </section>
    </main>
  );
}
