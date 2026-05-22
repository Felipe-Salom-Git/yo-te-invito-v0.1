'use client';

export function ProducerCommentsHelp() {
  return (
    <div className="rounded-xl border border-border/80 bg-bg-muted/40 p-4 sm:p-5">
      <p className="text-sm font-medium text-text">Cómo usar esta pantalla</p>
      <ul className="mt-2 space-y-1.5 text-sm text-text-muted">
        <li>· Las valoraciones son públicas en la ficha del evento salvo que estén ocultas o en revisión.</li>
        <li>· Tu respuesta oficial es pública y no modifica el puntaje.</li>
        <li>
          · Solicitá revisión solo si considerás que el comentario incumple las reglas de la plataforma o no
          corresponde al evento. Administración decide; no implica eliminación automática.
        </li>
        <li>· No podés borrar reseñas desde el portal productor.</li>
      </ul>
    </div>
  );
}
