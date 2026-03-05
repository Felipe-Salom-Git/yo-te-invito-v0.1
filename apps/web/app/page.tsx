'use client';

import { useEventsList } from '@/lib/query/events';

export default function HomePage() {
  const { data, isLoading, error } = useEventsList(1, 10);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <h1 className="text-2xl font-bold text-slate-800">Yo Te Invito</h1>
        <p className="mt-4 text-slate-600">Loading events…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <h1 className="text-2xl font-bold text-slate-800">Yo Te Invito</h1>
        <p className="mt-4 text-red-600">Error loading events. Is the API running?</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-bold text-slate-800">Yo Te Invito</h1>
      <p className="mt-2 text-slate-600">Eventos disponibles</p>

      <ul className="mt-6 space-y-4">
        {data?.data.map((ev) => (
          <li
            key={ev.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 className="font-semibold text-slate-900">{ev.title}</h2>
            {ev.description && (
              <p className="mt-1 text-sm text-slate-600">{ev.description}</p>
            )}
            <div className="mt-2 flex gap-4 text-sm text-slate-500">
              {ev.venueName && <span>{ev.venueName}</span>}
              {ev.city && <span>{ev.city}</span>}
              <span>{new Date(ev.startAt).toLocaleDateString('es-AR')}</span>
            </div>
          </li>
        ))}
      </ul>

      {data?.meta && (
        <p className="mt-6 text-sm text-slate-500">
          Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total}{' '}
          events)
        </p>
      )}
    </main>
  );
}
