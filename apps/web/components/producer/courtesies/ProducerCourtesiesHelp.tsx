'use client';

import Link from 'next/link';

type Props = {
  eventId: string;
};

export function ProducerCourtesiesHelp({ eventId }: Props) {
  return (
    <div className="rounded-xl border border-border/80 bg-bg-muted/40 p-4 sm:p-5">
      <p className="text-sm font-medium text-text">¿Qué son las cortesías?</p>
      <p className="mt-2 text-sm text-text-muted">
        Las cortesías te permiten otorgar entradas sin pago. Cada otorgamiento genera tickets con
        código QR válidos para el scanner (origen <span className="font-medium text-text">cortesía</span>
        , no son ventas de checkout).
      </p>
      <ul className="mt-3 space-y-2 text-sm text-text-muted">
        <li>
          <span className="font-medium text-text">Desde tipo de entrada</span> — consume stock de la
          tanda activa del tipo y del cupo del tipo (igual que una venta en esa tanda).
        </li>
        <li>
          <span className="font-medium text-text">Capacidad del evento</span> — no descuenta tandas;
          solo valida el cupo total del recinto si el evento tiene capacidad máxima definida.
        </li>
      </ul>
      <p className="mt-3 text-xs text-text-muted">
        El cupo de cortesías para un referido en un evento se gestiona aparte en{' '}
        <Link
          href={`/producer/events/${eventId}/referrals`}
          className="text-accent hover:underline"
        >
          Referidos del evento
        </Link>
        . No reemplaza este otorgamiento directo.
      </p>
    </div>
  );
}
