'use client';

const ITEMS = [
  {
    term: 'Tipo de entrada',
    detail: 'Categoría de venta del evento (ej. VIP, General, Popular). Tiene un stock total y puede incluir varias tandas.',
  },
  {
    term: 'Tanda',
    detail: 'Etapa de venta dentro del tipo: precio, cupos y ventana de fechas. Las tandas se encadenan en orden.',
  },
  {
    term: 'Stock',
    detail: 'Cupos del tipo. La suma de cupos base de todas las tandas debe igualar la capacidad total (salvo ventas ya realizadas).',
  },
  {
    term: 'Tanda activa',
    detail: 'La que recibe ventas ahora. La siguiente se activa cuando la anterior se agota o vence su fecha (el remanente puede pasar a la siguiente).',
  },
] as const;

export function ProducerTicketTypesHelp() {
  return (
    <div className="rounded-xl border border-border/80 bg-bg-muted/40 p-4 sm:p-5">
      <p className="text-sm font-medium text-text">Cómo funcionan entradas y tandas</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <div key={item.term}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-accent">
              {item.term}
            </dt>
            <dd className="mt-1 text-sm text-text-muted">{item.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
