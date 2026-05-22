import type { EventSummary } from '@/repositories/interfaces';
import {
  isEventActive,
  isEventFuture,
  isEventPast,
} from '@/lib/eventCycleHelpers';

/** Producer events list filter tabs (UI lifecycle + moderation). */
export type ProducerEventFilterTab =
  | 'all'
  | 'active'
  | 'upcoming'
  | 'past'
  | 'pending'
  | 'draft'
  | 'paused';

export type ProducerEventSort = 'startAsc' | 'startDesc' | 'recent';

export const PRODUCER_EVENT_FILTER_TABS: Array<{
  id: ProducerEventFilterTab;
  label: string;
}> = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'upcoming', label: 'Próximos' },
  { id: 'past', label: 'Pasados' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'draft', label: 'Borradores' },
  { id: 'paused', label: 'Pausados' },
];

function eventStatus(ev: EventSummary): string {
  return (ev.status ?? 'DRAFT').toUpperCase();
}

export function matchesProducerEventTab(
  ev: EventSummary,
  tab: ProducerEventFilterTab,
): boolean {
  const status = eventStatus(ev);
  const endAt = ev.endAt ?? null;

  switch (tab) {
    case 'all':
      return true;
    case 'draft':
      return status === 'DRAFT';
    case 'pending':
      return status === 'PENDING';
    case 'paused':
      return status === 'PAUSED' || status === 'CANCELLED';
    case 'active':
      return status === 'APPROVED' && isEventActive(ev.startAt, endAt);
    case 'upcoming':
      return status === 'APPROVED' && isEventFuture(ev.startAt);
    case 'past':
      return isEventPast(ev.startAt, endAt);
    default:
      return true;
  }
}

export function countEventsByProducerTab(
  events: EventSummary[],
): Record<ProducerEventFilterTab, number> {
  const counts: Record<ProducerEventFilterTab, number> = {
    all: events.length,
    active: 0,
    upcoming: 0,
    past: 0,
    pending: 0,
    draft: 0,
    paused: 0,
  };
  for (const ev of events) {
    for (const tab of PRODUCER_EVENT_FILTER_TABS) {
      if (tab.id !== 'all' && matchesProducerEventTab(ev, tab.id)) {
        counts[tab.id] += 1;
      }
    }
  }
  return counts;
}

export function filterProducerEvents(
  events: EventSummary[],
  tab: ProducerEventFilterTab,
  search: string,
): EventSummary[] {
  const q = search.trim().toLowerCase();
  let list = events.filter((ev) => matchesProducerEventTab(ev, tab));
  if (q) {
    list = list.filter((ev) => {
      const hay = [ev.title, ev.city, ev.venueName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }
  return list;
}

export function sortProducerEvents(
  events: EventSummary[],
  sort: ProducerEventSort,
  tab: ProducerEventFilterTab,
): EventSummary[] {
  const list = [...events];
  const effectiveSort =
    sort === 'startAsc' && tab === 'past' ? 'startDesc' : sort;

  list.sort((a, b) => {
    if (effectiveSort === 'recent') {
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return cb - ca;
    }
    const ta = new Date(a.startAt).getTime();
    const tb = new Date(b.startAt).getTime();
    return effectiveSort === 'startDesc' ? tb - ta : ta - tb;
  });
  return list;
}

export type ProducerEventEmptyState = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function emptyStateForProducerTab(
  tab: ProducerEventFilterTab,
  hasAnyEvents: boolean,
): ProducerEventEmptyState {
  if (!hasAnyEvents) {
    return {
      title: 'Todavía no creaste eventos',
      description: 'Publicá tu primer evento para vender entradas y gestionar referidos.',
      actionLabel: 'Crear primer evento',
      actionHref: '/producer/events/new',
    };
  }
  switch (tab) {
    case 'upcoming':
      return {
        title: 'No tenés eventos próximos publicados',
        description: 'Los eventos aprobados con fecha futura aparecen en esta pestaña.',
        actionLabel: 'Crear evento',
        actionHref: '/producer/events/new',
      };
    case 'active':
      return {
        title: 'No hay eventos activos ahora',
        description: 'Un evento publicado aparece acá mientras está en curso según su fecha.',
      };
    case 'past':
      return {
        title: 'Sin eventos pasados',
        description: 'Tus eventos finalizados van a aparecer acá.',
      };
    case 'pending':
      return {
        title: 'No tenés eventos pendientes de revisión',
        description: 'Cuando envíes un evento a revisión, lo vas a ver en esta pestaña.',
      };
    case 'draft':
      return {
        title: 'No tenés borradores',
        description: 'Los eventos en borrador que aún no enviaste aparecen acá.',
        actionLabel: 'Crear evento',
        actionHref: '/producer/events/new',
      };
    case 'paused':
      return {
        title: 'No hay eventos pausados o cancelados',
        description: 'Eventos pausados o cancelados por administración se listan acá.',
      };
    default:
      return {
        title: 'No hay eventos con este filtro',
        description: 'Probá otro filtro o creá un evento nuevo.',
        actionLabel: 'Crear evento',
        actionHref: '/producer/events/new',
      };
  }
}

export type ProducerEventHint = {
  tone: 'info' | 'warning';
  message: string;
};

/** Status hints from real event fields only. */
export function hintForProducerEvent(ev: EventSummary): ProducerEventHint | null {
  const status = eventStatus(ev);
  if (status === 'PENDING') {
    return { tone: 'info', message: 'Este evento está esperando revisión.' };
  }
  if (status === 'DRAFT') {
    return {
      tone: 'info',
      message: 'Completá la información y envialo a revisión para publicarlo.',
    };
  }
  if (status === 'CANCELLED') {
    return {
      tone: 'warning',
      message: 'Este evento fue cancelado. Revisá las observaciones antes de volver a enviarlo.',
    };
  }
  if (status === 'PAUSED') {
    return {
      tone: 'warning',
      message: 'Este evento está pausado. Contactá al equipo si necesitás reactivarlo.',
    };
  }
  if (
    status === 'APPROVED' &&
    isEventFuture(ev.startAt) &&
    !ev.isGeneralPublication &&
    !ev.isTicketingEnabled
  ) {
    return {
      tone: 'info',
      message: 'Agregá tipos de entrada en Gestionar para empezar a vender.',
    };
  }
  return null;
}

export function interestRatePercent(
  views: number,
  favorites: number,
  expected: number,
): number | null {
  if (views <= 0) return null;
  return Math.round(((favorites + expected) / views) * 1000) / 10;
}
