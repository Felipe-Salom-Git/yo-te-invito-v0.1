import type { EventSummary } from '@/repositories/interfaces';

export interface EventMonthGroup {
  key: string;
  label: string;
  items: EventSummary[];
}

const monthFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  year: 'numeric',
});

export function groupEventsByMonth(events: EventSummary[]): EventMonthGroup[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  const map = new Map<string, EventSummary[]>();

  for (const event of sorted) {
    const d = new Date(event.startAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = map.get(key);
    if (bucket) bucket.push(event);
    else map.set(key, [event]);
  }

  return Array.from(map.entries()).map(([key, items]) => {
    const [year, month] = key.split('-').map(Number);
    const label = monthFormatter.format(new Date(year, month - 1, 1));
    return {
      key,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      items,
    };
  });
}

export function formatEventDateTime(startAt: string): { date: string; time: string } {
  const d = new Date(startAt);
  return {
    date: d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  };
}
