export const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  SENDING: 'Enviando',
  COMPLETED: 'Completada',
  PARTIAL: 'Parcial',
  FAILED: 'Fallida',
  CANCELLED: 'Cancelada',
};

export const CAMPAIGN_CHANNEL_LABEL: Record<string, string> = {
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
};

export const CAMPAIGN_CONTENT_TYPE_LABEL: Record<string, string> = {
  GASTRO_DISCOUNT: 'Descuento Gastro',
  ACTIVITY_COUPON: 'Cupón de actividad',
  EVENT: 'Evento',
  EXCURSION: 'Excursión',
};

export const CAMPAIGN_AUDIENCE_LABEL: Record<string, string> = {
  ALL_ELIGIBLE: 'Todos los usuarios elegibles',
  CITY: 'Ciudad',
  FAVORITE_CATEGORY: 'Categoría favorita',
  CONTENT_CLAIMANTS: 'Quienes reclamaron este contenido',
};

export const CAMPAIGN_DELIVERY_STATUS_LABEL: Record<string, string> = {
  QUEUED: 'En cola',
  SENT: 'Enviado al proveedor',
  SKIPPED: 'Omitido',
  FAILED: 'Fallido',
};

export const CAMPAIGN_CATEGORY_OPTIONS = [
  { value: 'event', label: 'Eventos' },
  { value: 'gastro', label: 'Gastronomía' },
  { value: 'rental', label: 'Rentals' },
  { value: 'excursion', label: 'Excursiones' },
  { value: 'hotel', label: 'Hoteles' },
];
