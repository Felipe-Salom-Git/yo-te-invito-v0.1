'use client';

type Props = {
  variant?: 'global' | 'event';
};

export function ProducerReferralsHelp({ variant = 'global' }: Props) {
  return (
    <div className="rounded-xl border border-border/80 bg-bg-muted/40 p-4 sm:p-5">
      <p className="text-sm font-medium text-text">¿Qué es un referido?</p>
      <p className="mt-2 text-sm text-text-muted">
        Un referido promociona tus eventos con un link de venta. Cuando alguien compra con ese código,
        la venta queda atribuida al referidor.
      </p>
      <ul className="mt-3 space-y-2 text-sm text-text-muted">
        {variant === 'global' ? (
          <>
            <li>
              <span className="font-medium text-text">Asociación general</span> — vínculo entre tu
              productora y el referidor (directorio o solicitud).
            </li>
            <li>
              <span className="font-medium text-text">Asignación por evento</span> — el referidor
              participa en un evento concreto; se genera el link de checkout y podés definir cupo de
              cortesías para esa asignación.
            </li>
          </>
        ) : (
          <>
            <li>
              <span className="font-medium text-text">Asociado</span> — relación general activa con tu
              productora.
            </li>
            <li>
              <span className="font-medium text-text">Asignado</span> — participa en este evento con link
              de venta y, si corresponde, cupo de cortesías del evento.
            </li>
          </>
        )}
        <li>
          Los links usan <span className="font-mono text-xs text-accent">?ref=código</span> en el checkout
          (también existe la ruta corta <span className="font-mono text-xs">/r/código</span>).
        </li>
      </ul>
    </div>
  );
}
