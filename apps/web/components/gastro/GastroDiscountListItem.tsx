import Link from 'next/link';
import { GASTRO_WEEKDAY_LABELS_ES, type GastroWeekday } from '@yo-te-invito/shared';
import type { GastroPortalDiscount } from '@/repositories/interfaces';
import { GastroDiscountKindBadge } from './GastroDiscountKindBadge';
import {
  formatGastroDiscountValidityRangeLabel,
  gastroDiscountPortalStatusLabel,
} from '@/lib/gastro/discount-status-ui';

/** Owner list row of a PUBLIC discount (courtesies use `GastroCourtesyListItem`). */
export function GastroDiscountListItem({ item, href }: { item: GastroPortalDiscount; href: string }) {
  const range =
    item.validityMode === 'WEEKLY_RECURRING' && item.validWeekday
      ? null
      : formatGastroDiscountValidityRangeLabel(item.validFrom, item.validTo, item.discountDate);
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border p-4 transition hover:border-accent/50 hover:bg-bg-muted/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {item.title ?? item.code}
            <span className="ml-2 align-middle">
              <GastroDiscountKindBadge visibility={item.visibility} />
            </span>
          </p>
          <p className="text-sm text-text-muted">{item.summary}</p>
          {item.hasPendingUpdate && (
            <p className="mt-1 text-xs text-amber-300">Edición pendiente de revisión</p>
          )}
          {item.validityMode === 'WEEKLY_RECURRING' && item.validWeekday ? (
            <p className="mt-1 text-xs text-text-muted">
              Todos los {GASTRO_WEEKDAY_LABELS_ES[item.validWeekday as GastroWeekday]}
            </p>
          ) : range ? (
            <p className="mt-1 text-xs text-text-muted">Vigencia: {range}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-bg-muted px-2 py-0.5 text-xs text-text">
          {gastroDiscountPortalStatusLabel({ status: item.status, archivedAt: item.archivedAt })}
        </span>
      </div>
    </Link>
  );
}
