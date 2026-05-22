import type { PublicReviewCategory } from '@yo-te-invito/shared';

export const REVIEW_DISPUTE_REASON_LABELS: Record<string, string> = {
  UNFAIR_RATING: 'Calificación injusta',
  OFFENSIVE: 'Comentario ofensivo',
  FALSE_INFORMATION: 'Información falsa',
  WRONG_EVENT: 'No corresponde al evento',
  OTHER: 'Otro',
};

export const EVENT_CATEGORY_LABELS: Record<PublicReviewCategory, string> = {
  event: 'Evento',
  gastro: 'Gastronomía',
  rental: 'Rentals',
  excursion: 'Excursión',
  hotel: 'Hotel',
};

export function formatAdminDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export const ADMIN_DISPUTE_ACTION_COPY = {
  accept: {
    title: 'Aceptar solicitud de revisión',
    body: 'La reseña se ocultará del listado público y dejará de contar en promedios. La disputa quedará marcada como aceptada.',
    confirm: 'Aceptar y ocultar reseña',
  },
  reject: {
    title: 'Rechazar solicitud',
    body: 'La reseña permanecerá visible para el público (estado «reporte rechazado»). La productora verá la solicitud como rechazada.',
    confirm: 'Rechazar solicitud',
  },
  resolve: {
    title: 'Resolver sin ocultar',
    body: 'Cierra la disputa como resuelta sin cambiar la visibilidad pública de la reseña. Usá esto cuando el conflicto quedó aclarado por otros medios.',
    confirm: 'Marcar resuelta',
  },
  inReview: {
    title: 'Marcar en revisión',
    body: 'Indica que el equipo está analizando el caso. La reseña sigue visible hasta que tomes otra acción.',
    confirm: 'Marcar en revisión',
  },
  hide: {
    title: 'Ocultar reseña del público',
    body: 'Oculta la valoración sin cerrar automáticamente la disputa. El contenido deja de mostrarse en fichas públicas.',
    confirm: 'Ocultar reseña',
  },
  restore: {
    title: 'Restaurar visibilidad pública',
    body: 'Vuelve a mostrar la reseña en listados públicos si su estado lo permite. Revisá el contexto de la disputa antes de restaurar.',
    confirm: 'Restaurar reseña',
  },
} as const;
