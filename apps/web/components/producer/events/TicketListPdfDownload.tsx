'use client';

import { useState } from 'react';
import { Button, useToast } from '@/components';
import { downloadProducerTicketListPdf } from '@/lib/producer/download-ticket-list-pdf';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  eventId: string;
  ticketCount?: number;
  disabled?: boolean;
};

export function TicketListPdfDownload({ eventId, ticketCount = 0, disabled }: Props) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (!eventId) return;
    if (ticketCount === 0) {
      addToast('No hay entradas para exportar en este evento.', 'error');
      return;
    }
    setLoading(true);
    try {
      await downloadProducerTicketListPdf(eventId);
      addToast('Listado PDF descargado', 'success');
    } catch (e) {
      addToast(getErrorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-bg-muted p-4">
      <h3 className="text-sm font-semibold text-text">Listado de control (PDF)</h3>
      <p className="mt-1 text-sm text-text-muted">
        Descargá un listado de control para puerta. La validación oficial sigue siendo con QR.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        disabled={disabled || loading || ticketCount === 0}
        onClick={() => void handleDownload()}
      >
        {loading ? 'Descargando…' : 'Descargar listado PDF'}
      </Button>
    </div>
  );
}
