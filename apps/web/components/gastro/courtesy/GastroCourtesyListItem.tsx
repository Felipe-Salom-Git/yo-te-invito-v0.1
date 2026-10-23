import Link from 'next/link';
import { resolveCourtesyBenefitLabel } from '@yo-te-invito/shared';
import type { GastroPortalDiscount } from '@/repositories/interfaces';
import { GastroDiscountKindBadge } from '@/components/gastro/GastroDiscountKindBadge';
import { GastroCourtesyStatusBadge } from './GastroCourtesyStatusBadge';
import { formatGastroDiscountValidityRangeLabel } from '@/lib/gastro/discount-status-ui';
import { formatCourtesyAudience } from '@/lib/gastro/courtesy-portal';

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

/**
 * G8.9.1 — Courtesy row of the selected local: campaign, benefit, state, frozen audience,
 * available / used / cancelled, vigencia and creation date. Never shows "0%".
 */
export function GastroCourtesyListItem({ item, href }: { item: GastroPortalDiscount; href: string }) {
  const metrics = item.courtesyMetrics;
  const range = formatGastroDiscountValidityRangeLabel(item.validFrom, item.validTo, item.discountDate);
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border p-4 transition hover:border-accent/50 hover:bg-bg-muted/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">
            {item.courtesyCampaign?.title ?? item.title ?? item.code}
            <span className="ml-2 align-middle">
              <GastroDiscountKindBadge visibility={item.visibility} />
            </span>
          </p>
          <p className="text-sm text-text-muted">
            {resolveCourtesyBenefitLabel(item.courtesyCampaign, item.title)}
          </p>
          {range ? <p className="mt-1 text-xs text-text-muted">Vigencia: {range}</p> : null}
          <p className="mt-1 text-xs text-text-muted">Creada el {formatDay(item.createdAt)}</p>
        </div>
        <GastroCourtesyStatusBadge
          status={item.status}
          archivedAt={item.archivedAt}
          validTo={item.validTo}
        />
      </div>
      {metrics ? (
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
          <div>
            <dt className="sr-only">Destinatarios</dt>
            <dd>{formatCourtesyAudience(metrics)}</dd>
          </div>
          {metrics.retainedClaims > 0 ? (
            <div>
              <dt className="inline">Retenidos: </dt>
              <dd className="inline">{metrics.retainedClaims}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline">Disponibles: </dt>
            <dd className="inline">{metrics.availableClaims}</dd>
          </div>
          <div>
            <dt className="inline">Usados: </dt>
            <dd className="inline">{metrics.usedClaims}</dd>
          </div>
          <div>
            <dt className="inline">Cancelados: </dt>
            <dd className="inline">{metrics.cancelledClaims}</dd>
          </div>
        </dl>
      ) : null}
    </Link>
  );
}
