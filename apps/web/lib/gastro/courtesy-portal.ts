/**
 * G8.9 — Pure helpers for the courtesy experience in the Gastro portal (and reused by ADMIN).
 * Helpers puros de la experiencia de cortesías del portal Gastro (reutilizados por ADMIN).
 */
import type {
  CourtesyDisplayState,
  GastroCourtesyCampaignMetrics,
  GastroDiscountLifecycleBucket,
} from '@yo-te-invito/shared';
import type { DiscountVisibilityFilter } from './courtesy-scope';

/** `?tipo=` keeps the Descuentos / Cortesías filter across navigation and location switch. */
const TYPE_PARAM_TO_FILTER: Record<string, DiscountVisibilityFilter> = {
  descuentos: 'PUBLIC',
  cortesias: 'COURTESY_ONLY',
};

export function parseDiscountTypeParam(value: string | null | undefined): DiscountVisibilityFilter {
  return (value && TYPE_PARAM_TO_FILTER[value.trim().toLowerCase()]) || 'ALL';
}

export function discountTypeParam(filter: DiscountVisibilityFilter): string | null {
  if (filter === 'PUBLIC') return 'descuentos';
  if (filter === 'COURTESY_ONLY') return 'cortesias';
  return null;
}

export const GASTRO_COURTESY_STATE_BADGE_CLASS: Record<CourtesyDisplayState, string> = {
  PENDING: 'bg-amber-500/15 text-amber-300',
  ACTIVE: 'bg-accent/20 text-accent',
  REJECTED: 'bg-red-500/15 text-red-300',
  CANCELLED: 'bg-zinc-500/15 text-zinc-300',
  EXPIRED: 'bg-border text-text-muted',
  ARCHIVED: 'bg-border text-text-muted',
};

const CLAIM_SOURCE_LABELS: Record<string, string> = {
  MANUAL_EMAIL: 'Email individual',
  FOLLOWERS: 'Seguidor del local',
  WEB: 'Solicitud web',
};

export function courtesyClaimSourceLabel(source: string): string {
  return CLAIM_SOURCE_LABELS[source] ?? source;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "3 destinatarios · 2 por email · 1 seguidor" (frozen audience, never recalculated). */
export function formatCourtesyAudience(
  metrics: Pick<
    GastroCourtesyCampaignMetrics,
    'recipientCount' | 'manualRecipientCount' | 'followerRecipientCount'
  >,
): string {
  const parts = [plural(metrics.recipientCount, 'destinatario', 'destinatarios')];
  if (metrics.manualRecipientCount > 0) {
    parts.push(`${metrics.manualRecipientCount} por email`);
  }
  if (metrics.followerRecipientCount > 0) {
    parts.push(plural(metrics.followerRecipientCount, 'seguidor', 'seguidores'));
  }
  return parts.join(' · ');
}

export type CourtesyMetricCard = { key: keyof GastroCourtesyCampaignMetrics; label: string; value: number };

/**
 * Owner/admin metric cards (G8.8 buckets). Retained only while it means something; never
 * counted as delivered. Zero-valued secondary buckets are hidden to avoid filler.
 */
export function buildCourtesyMetricCards(
  metrics: GastroCourtesyCampaignMetrics,
  opts: { includePendingDelivery?: boolean } = {},
): CourtesyMetricCard[] {
  const cards: CourtesyMetricCard[] = [
    { key: 'recipientCount', label: 'Destinatarios', value: metrics.recipientCount },
  ];
  if (metrics.retainedClaims > 0) {
    cards.push({
      key: 'retainedClaims',
      label: 'Retenidos (pendiente de aprobación)',
      value: metrics.retainedClaims,
    });
  }
  cards.push(
    { key: 'availableClaims', label: 'Disponibles', value: metrics.availableClaims },
    { key: 'deliveredClaims', label: 'Entregados', value: metrics.deliveredClaims },
    { key: 'usedClaims', label: 'Usados', value: metrics.usedClaims },
    { key: 'cancelledClaims', label: 'Cancelados', value: metrics.cancelledClaims },
  );
  if (metrics.expiredClaims > 0) {
    cards.push({ key: 'expiredClaims', label: 'Vencidos', value: metrics.expiredClaims });
  }
  if (opts.includePendingDelivery && metrics.pendingDeliveryClaims > 0) {
    cards.push({
      key: 'pendingDeliveryClaims',
      label: 'Pendientes de entrega',
      value: metrics.pendingDeliveryClaims,
    });
  }
  return cards;
}

export type CourtesyEmptyState = { title: string; description?: string; showCreate: boolean };

const BUCKET_EMPTY_TITLES: Record<GastroDiscountLifecycleBucket, string> = {
  ACTIVE: 'No hay cortesías activas en este local.',
  PENDING: 'No hay cortesías pendientes de aprobación.',
  FINISHED: 'No hay cortesías vencidas, rechazadas ni canceladas.',
  ARCHIVED: 'No hay cortesías archivadas.',
};

const BUCKET_HINT_LABELS: Record<GastroDiscountLifecycleBucket, string> = {
  ACTIVE: 'activas',
  PENDING: 'pendientes de aprobación',
  FINISHED: 'finalizadas',
  ARCHIVED: 'archivadas',
};

/**
 * Empty state of the courtesy list for the selected local:
 *  - no courtesy at all → invite to create one (only an ACTIVE local can request);
 *  - courtesies exist in other tabs → say where they are (e.g. only pending / only cancelled).
 */
export function resolveCourtesyEmptyState(input: {
  bucket: GastroDiscountLifecycleBucket;
  countsByBucket: Record<GastroDiscountLifecycleBucket, number>;
  canCreate: boolean;
}): CourtesyEmptyState {
  const total = Object.values(input.countsByBucket).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return {
      title: 'Todavía no solicitaste cortesías para este local.',
      description: input.canCreate
        ? 'Elegí destinatarios y enviá la solicitud: administración la revisa antes de entregarla.'
        : 'Solo un local activo puede solicitar cortesías.',
      showCreate: input.canCreate,
    };
  }
  const elsewhere = (Object.keys(input.countsByBucket) as GastroDiscountLifecycleBucket[])
    .filter((b) => b !== input.bucket && input.countsByBucket[b] > 0)
    .map((b) => `${input.countsByBucket[b]} ${BUCKET_HINT_LABELS[b]}`);
  return {
    title: BUCKET_EMPTY_TITLES[input.bucket],
    description: elsewhere.length > 0 ? `Este local tiene ${elsewhere.join(', ')}.` : undefined,
    showCreate: input.canCreate && input.bucket !== 'ARCHIVED',
  };
}
