'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EventSummary } from '@/repositories/interfaces';
import {
  currentMonthKey,
  monthLabel,
  shiftMonthKey,
  useEventsCalendarMonth,
} from '@/lib/query/useEventDiscovery';
import { EventCalendarEventPopover } from './EventCalendarEventPopover';

const DAY_CELL_HEIGHT = 'h-[92px]';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function buildCalendarCells(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const startPad = first.getDay();
  const cells: Array<{ day: number | null; dateKey: string | null }> = [];

  for (let i = 0; i < startPad; i++) {
    cells.push({ day: null, dateKey: null });
  }
  for (let d = 1; d <= lastDay; d++) {
    const dateKey = `${monthKey}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateKey });
  }
  return cells;
}

function eventsByDateKey(events: EventSummary[], monthKey: string): Map<string, EventSummary[]> {
  const map = new Map<string, EventSummary[]>();
  for (const e of events) {
    const d = new Date(e.startAt);
    const key = `${monthKey}-${String(d.getDate()).padStart(2, '0')}`;
    const list = map.get(key);
    if (list) list.push(e);
    else map.set(key, [e]);
  }
  for (const [, list] of map) {
    list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }
  return map;
}

export function EventCalendarModal({
  open,
  onClose,
  subcategorySlug,
}: {
  open: boolean;
  onClose: () => void;
  subcategorySlug?: string | null;
}) {
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventSummary | null>(null);

  const { data, isLoading } = useEventsCalendarMonth(monthKey, subcategorySlug);

  const events = data?.data ?? [];
  const byDay = useMemo(() => eventsByDateKey(events, monthKey), [events, monthKey]);
  const cells = useMemo(() => buildCalendarCells(monthKey), [monthKey]);

  useEffect(() => {
    if (open) {
      setMonthKey(currentMonthKey());
      setExpandedDay(null);
      setSelectedEvent(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative flex h-[min(780px,92dvh)] w-full max-w-[1100px] flex-col overflow-hidden rounded-t-2xl border border-white/15 bg-black shadow-2xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMonthKey((m) => shiftMonthKey(m, -1))}
            className="text-sm text-white/70 hover:text-accent"
          >
            ← Mes anterior
          </button>
          <h2 className="text-lg font-semibold text-white">{monthLabel(monthKey)}</h2>
          <button
            type="button"
            onClick={() => setMonthKey((m) => shiftMonthKey(m, 1))}
            className="text-sm text-white/70 hover:text-accent"
          >
            Mes siguiente →
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <p className="text-center text-sm text-white/60">Cargando calendario…</p>
          ) : (
            <>
              <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-sm font-medium text-white/50">
                {WEEKDAYS.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {cells.map((cell, i) => {
                  if (cell.day == null || !cell.dateKey) {
                    return (
                      <div key={`empty-${i}`} className={`${DAY_CELL_HEIGHT} rounded-md bg-white/5`} />
                    );
                  }
                  const dayEvents = byDay.get(cell.dateKey) ?? [];
                  const visible = dayEvents.slice(0, 3);
                  const more = dayEvents.length - visible.length;

                  return (
                    <div
                      key={cell.dateKey}
                      className={`flex ${DAY_CELL_HEIGHT} flex-col rounded-md border border-white/10 bg-white/5 p-1.5`}
                    >
                      <p className="text-xs font-semibold text-white/80">{cell.day}</p>
                      <ul className="mt-0.5 min-h-0 flex-1 space-y-0.5 overflow-hidden">
                        {(expandedDay === cell.dateKey ? dayEvents : visible).map((ev) => (
                          <li key={ev.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedEvent(ev)}
                              className="w-full truncate text-left text-[10px] leading-tight text-accent hover:underline sm:text-[11px]"
                              title={ev.title}
                            >
                              {ev.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                      {more > 0 && expandedDay !== cell.dateKey && (
                        <button
                          type="button"
                          onClick={() => setExpandedDay(cell.dateKey)}
                          className="mt-auto text-[10px] text-white/50 hover:text-accent"
                        >
                          + {more} más
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 px-4 py-3 text-right sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>

        {selectedEvent ? (
          <EventCalendarEventPopover
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
