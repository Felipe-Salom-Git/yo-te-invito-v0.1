'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SectionTitle, Button } from '@/components';
import { ProducerEventModeCard } from './ProducerEventModeCard';
import { producerEventModeToQuery, type ProducerEventMode } from '@/lib/producer/event-mode';

export function ProducerEventModeSelector() {
  const router = useRouter();
  const [selected, setSelected] = useState<ProducerEventMode | null>(null);

  return (
    <div className="max-w-4xl">
      <SectionTitle>Crear nuevo evento</SectionTitle>
      <p className="mt-2 text-text-muted">¿Qué tipo de evento querés crear?</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <ProducerEventModeCard
          title="Solo Publicidad"
          description="Publicá tu evento para que aparezca en la plataforma como difusión. Ideal para eventos informativos, gratuitos o propuestas que no venden entradas desde Yo Te Invito."
          bullets={[
            'No incluye ticketera ni venta de entradas.',
            'Visible en listados, categoría y calendario.',
            'No aparece en Destacados.',
          ]}
          cta="Crear publicación"
          selected={selected === 'PUBLICITY_ONLY'}
          onSelect={() => setSelected('PUBLICITY_ONLY')}
        />
        <ProducerEventModeCard
          title="Con Ticketera"
          description="Publicá tu evento y vendé entradas desde Yo Te Invito. Vas a poder configurar tipos de entrada, tandas, precios, cupos y usar el sistema de tickets y scanner."
          bullets={[
            'Incluye gestión de entradas y métricas de venta.',
            'Puede aparecer en Destacados si está aprobado y con entradas activas.',
            'Configurás tipos de entrada en el mismo flujo o después.',
          ]}
          cta="Crear evento con ticketera"
          selected={selected === 'TICKETED'}
          onSelect={() => setSelected('TICKETED')}
        />
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <Link href="/producer/events">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
        <Button
          type="button"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            router.push(`/producer/events/new?mode=${producerEventModeToQuery(selected)}`);
          }}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
