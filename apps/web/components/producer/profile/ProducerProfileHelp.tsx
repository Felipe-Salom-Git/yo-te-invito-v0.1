'use client';

export function ProducerProfileHelp() {
  return (
    <div className="rounded-xl border border-border/80 bg-bg-muted/40 p-4 sm:p-5">
      <p className="text-sm font-medium text-text">¿Qué es público?</p>
      <p className="mt-2 text-sm text-text-muted">
        Tu ficha en <span className="font-mono text-xs text-accent">/producers/[tu-url]</span> muestra
        (la URL se genera sola desde el nombre de la productora, sin repetir otras)
        nombre, descripción, imágenes, eventos y los datos de contacto que cargues acá. Las reseñas
        y valoraciones siguen en sus propias secciones; no se editan desde este hub.
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-text-muted">
        <li>· Completá por bloques: identidad, imágenes y contacto.</li>
        <li>· El progreso se calcula en este dispositivo; no se guarda en el servidor.</li>
        <li>· Si el perfil está en borrador, puede no aparecer en listados públicos del tenant.</li>
      </ul>
    </div>
  );
}
