import {
  GASTRO_COURTESY_STATE_LABELS,
  resolveCourtesyDisplayState,
  type CourtesyStateInput,
} from '@yo-te-invito/shared';
import { GASTRO_COURTESY_STATE_BADGE_CLASS } from '@/lib/gastro/courtesy-portal';

/** G8.9: human courtesy state (Pendiente de aprobación / Activa / Rechazada / …). */
export function GastroCourtesyStatusBadge(props: CourtesyStateInput) {
  const state = resolveCourtesyDisplayState(props);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${GASTRO_COURTESY_STATE_BADGE_CLASS[state]}`}
    >
      {GASTRO_COURTESY_STATE_LABELS[state]}
    </span>
  );
}
