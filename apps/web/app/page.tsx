'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useEventsList,
  useEventsSearch,
  useEventsTrending,
} from '@/lib/query/events';

const DEFAULT_TENANT_ID = 'default-tenant';

function EventCard({
  ev,
  showProducerLinks = false,
}: {
  ev: { id: string; title: string; startAt: string; city: string | null; venueName: string | null };
  showProducerLinks?: boolean;
}) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/events/${ev.id}?tenantId=${DEFAULT_TENANT_ID}`} className="flex-1">
          <h2 className="font-semibold text-slate-900 hover:text-slate-700">{ev.title}</h2>
          <div className="mt-2 flex gap-4 text-sm text-slate-500">
            {ev.venueName && <span>{ev.venueName}</span>}
            {ev.city && <span>{ev.city}</span>}
            <span>{new Date(ev.startAt).toLocaleDateString('es-AR')}</span>
          </div>
        </Link>
        {showProducerLinks && (
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/producer/events/${ev.id}/courtesies`}
              className="rounded bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-300"
            >
              Courtesies
            </Link>
            <Link
              href={`/producer/events/${ev.id}/referrals`}
              className="rounded bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-300"
            >
              Referrals
            </Link>
          </div>
        )}
      </div>
    </li>
  );
}

export default function HomePage() {
  const [searchQ, setSearchQ] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchSubmitted, setSearchSubmitted] = useState(false);

  const { data: upcomingData, isLoading: upcomingLoading, error: upcomingError } = useEventsList(
    DEFAULT_TENANT_ID,
    1,
    10,
  );

  const { data: trendingData } = useEventsTrending(DEFAULT_TENANT_ID, 10);

  const searchQuery = {
    tenantId: DEFAULT_TENANT_ID,
    q: searchQ.trim() || undefined,
    city: searchCity.trim() || undefined,
    page: 1,
    limit: 20,
  };

  const { data: searchData } = useEventsSearch(searchQuery, {
    enabled: searchSubmitted,
  });

  const showSearchResults = searchSubmitted && (searchQ.trim() || searchCity.trim());

  if (upcomingLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <h1 className="text-2xl font-bold text-slate-800">Yo Te Invito</h1>
        <p className="mt-4 text-slate-600">Loading events…</p>
      </main>
    );
  }

  if (upcomingError) {
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
      <Link
        href="/admin/audit"
        className="mt-2 inline-block text-sm text-slate-500 hover:text-slate-700"
      >
        Admin → Audit logs
      </Link>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-600">Search</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearchSubmitted(true);
          }}
          className="mt-2 flex flex-wrap gap-2"
        >
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search by title"
            className="rounded border border-slate-300 px-3 py-2"
          />
          <input
            type="text"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            placeholder="City"
            className="rounded border border-slate-300 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
          >
            Search
          </button>
        </form>
      </section>

      {showSearchResults && searchData && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-800">Search results</h2>
          {searchData.data.length === 0 ? (
            <p className="mt-4 text-slate-500">No events found</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {searchData.data.map((ev) => (
                <EventCard key={ev.id} ev={ev} />
              ))}
            </ul>
          )}
          {searchData.meta && searchData.meta.total > searchData.meta.limit && (
            <p className="mt-2 text-sm text-slate-500">
              {searchData.meta.total} results
            </p>
          )}
        </section>
      )}

      {trendingData && trendingData.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-800">Trending</h2>
          <ul className="mt-4 space-y-4">
            {trendingData.map((ev) => (
              <EventCard key={ev.id} ev={ev} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-800">Upcoming events</h2>
        <ul className="mt-4 space-y-4">
          {upcomingData?.data.map((ev) => (
            <EventCard key={ev.id} ev={ev} showProducerLinks />
          ))}
        </ul>

        {upcomingData?.meta && (
          <p className="mt-6 text-sm text-slate-500">
            Page {upcomingData.meta.page} of {upcomingData.meta.totalPages} (
            {upcomingData.meta.total} events)
          </p>
        )}
      </section>
    </main>
  );
}
