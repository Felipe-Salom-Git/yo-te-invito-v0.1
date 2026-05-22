'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components';
import type { ProducerEventMode } from '@/lib/producer/event-mode';

type Props = {
  eventId: string;
  mode: ProducerEventMode;
  variant: 'welcome' | 'saved';
};

export function ProducerEventPostSavePanel({ eventId, mode, variant }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const param = variant === 'welcome' ? 'welcome' : 'saved';
  const active = searchParams.get(param) === '1';

  const dismiss = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('welcome');
    url.searchParams.delete('saved');
    router.replace(url.pathname + (url.search || ''), { scroll: false });
  }, [router]);

  if (!active) return null;

  const isTicketed = mode === 'TICKETED';
  const title =
    variant === 'welcome'
      ? isTicketed
        ? 'Evento creado'
        : 'Publicación creada'
      : 'Cambios guardados';

  const subtitle =
    variant === 'welcome'
      ? isTicketed
        ? 'Tu evento quedó en borrador. Seguí con la configuración de entradas cuando quieras.'
        : 'Tu publicación quedó en borrador y será visible según el estado de aprobación.'
      : 'La ficha del evento se actualizó correctamente.';

  return (
    <div className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-text">{title}</p>
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={dismiss}>
          Cerrar
        </Button>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-text-muted">
        Próximos pasos
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {isTicketed ? (
          <Link href={`/producer/events/${eventId}`}>
            <Button type="button" variant="primary" size="sm">
              Configurar entradas y tandas
            </Button>
          </Link>
        ) : null}
        {isTicketed ? (
          <Link href={`/producer/events/${eventId}`}>
            <Button type="button" variant="outline" size="sm">
              Diseñar ticket
            </Button>
          </Link>
        ) : null}
        <Link href={`/producer/events/${eventId}/referrals`}>
          <Button type="button" variant="outline" size="sm">
            Crear referidos
          </Button>
        </Link>
        <Link href="/producer/events">
          <Button type="button" variant="outline" size="sm">
            Volver a eventos
          </Button>
        </Link>
        <Link href={`/producer/events/${eventId}/edit`}>
          <Button type="button" variant="ghost" size="sm">
            Seguir editando ficha
          </Button>
        </Link>
      </div>
    </div>
  );
}
