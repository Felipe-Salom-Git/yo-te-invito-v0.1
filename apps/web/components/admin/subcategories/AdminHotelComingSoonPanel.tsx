/** Hotel vertical — subcategories disabled until a later product phase. */
export function AdminHotelComingSoonPanel() {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-accent/25 bg-accent/5 p-6">
      <p className="text-lg font-semibold text-text">Hoteles — Próximamente</p>
      <p className="mt-2 max-w-xl text-sm text-text-muted">
        Las subcategorías de hoteles se habilitarán en una etapa posterior. Hoy el discovery
        principal opera con eventos, gastronomía, rentals y excursiones.
      </p>
      <p className="mt-3 text-xs text-text-muted">
        No es posible crear ni editar subcategorías de hotel desde administración.
      </p>
    </div>
  );
}
