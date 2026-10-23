import type { GastroLocationSummary } from '@yo-te-invito/shared';

/** Human labels for a gastro local. Never render the enum. */
export const GASTRO_LOCATION_STATUS_LABEL: Record<GastroLocationSummary['status'], string> = {
  DRAFT: 'Borrador',
  PENDING: 'Pendiente de aprobación',
  ACTIVE: 'Local activo',
  REJECTED: 'Solicitud rechazada',
  SUSPENDED: 'Local suspendido',
};

export function gastroLocationStatusLabel(status: string | null | undefined): string {
  const key = status?.trim().toUpperCase();
  if (key && key in GASTRO_LOCATION_STATUS_LABEL) {
    return GASTRO_LOCATION_STATUS_LABEL[key as GastroLocationSummary['status']];
  }
  return 'Estado del local';
}
