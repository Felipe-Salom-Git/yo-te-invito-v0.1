import {
  formatBenefitMoneyCents,
  formatDiscountVisualValidity,
  formatDiscountVisualBenefit,
  resolveCourtesyBenefitLabel,
  type BenefitCommercialAgreementDto,
  type DiscountVisualRenderContext,
} from '@yo-te-invito/shared';
import type { GastroDiscountNotifyAspect } from './gastro-lifecycle-notification-keys';

/**
 * G8.8 — Pure content for the owner-facing Gastro discount / courtesy lifecycle messages.
 *
 * One builder serves normal discounts AND courtesies so both speak the same commercial
 * language (same agreement lines, same wording for status/validity). The agreement is NEVER
 * persisted on the discount/campaign: callers resolve the CURRENT
 * `BenefitCommercialAgreement` at approval time and pass it in; settlement allocations keep
 * owning the economic snapshot.
 */

export type LifecycleDetail = { label: string; value: string };

export type DiscountLifecycleEvent = 'pending' | 'approved' | 'rejected' | 'expired';

/** Subset of the CURRENT agreement DTO that is shown to the partner. */
export type LifecycleAgreement = Pick<
  BenefitCommercialAgreementDto,
  'unitPriceCents' | 'currency' | 'barterMultiplier' | 'validFrom' | 'validTo'
>;

export type DiscountLifecycleContext = {
  event: DiscountLifecycleEvent;
  aspect: GastroDiscountNotifyAspect;
  isCourtesy: boolean;
  title: string;
  localName?: string | null;
  /** Courtesy campaign label (`discountLabel`). */
  courtesyLabel?: string | null;
  /** Normal discount value. */
  discountType?: 'PERCENT' | 'FIXED' | null;
  discountValue?: number | null;
  recipientCount?: number | null;
  validityMode?: DiscountVisualRenderContext['validityMode'];
  validWeekday?: DiscountVisualRenderContext['validWeekday'];
  validFrom?: Date | string | null;
  validTo?: Date | string | null;
  discountDate?: Date | string | null;
  /** Rejection reason ONLY if it exists (never invented). */
  reason?: string | null;
  /** CURRENT agreement resolved at approval time. Only rendered on `approved` (create). */
  agreement?: LifecycleAgreement | null;
};

export type DiscountLifecycleContent = {
  title: string;
  body: string;
  details: LifecycleDetail[];
};

/** "2.0000" → "2x", "1.5000" → "1.5x". */
export function formatBarterMultiplier(raw: string): string {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}x`;
  const [whole, frac = ''] = trimmed.split('.');
  const cleanFrac = frac.replace(/0+$/, '');
  return `${whole}${cleanFrac ? `.${cleanFrac}` : ''}x`;
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' (calendar date, no timezone shifting). */
export function formatAgreementCalendarDate(key: string | null | undefined): string | null {
  if (!key) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : key;
}

export function formatAgreementVigency(
  agreement: Pick<LifecycleAgreement, 'validFrom' | 'validTo'>,
): string {
  const from = formatAgreementCalendarDate(agreement.validFrom);
  const to = formatAgreementCalendarDate(agreement.validTo);
  if (from && to) return `${from} – ${to}`;
  if (from) return `Desde ${from}, sin fecha de fin`;
  if (to) return `Hasta ${to}`;
  return 'Sin vencimiento';
}

/**
 * Commercial agreement lines (same for discounts and courtesies).
 * unitPriceCents is the value recognised per validated use.
 */
export function buildAgreementDetails(
  agreement: LifecycleAgreement | null | undefined,
): LifecycleDetail[] {
  if (!agreement) return [];
  return [
    {
      label: 'Valor reconocido por uso',
      value: formatBenefitMoneyCents(agreement.unitPriceCents, agreement.currency || 'ARS'),
    },
    { label: 'Moneda', value: agreement.currency || 'ARS' },
    { label: 'Multiplicador de canje', value: formatBarterMultiplier(agreement.barterMultiplier) },
    { label: 'Vigencia del acuerdo', value: formatAgreementVigency(agreement) },
  ];
}

function validityLabel(ctx: DiscountLifecycleContext): string {
  return formatDiscountVisualValidity({
    validityMode: ctx.validityMode,
    validWeekday: ctx.validWeekday,
    validFrom: ctx.validFrom,
    validTo: ctx.validTo,
    discountDate: ctx.discountDate,
  });
}

function baseDetails(ctx: DiscountLifecycleContext, statusLabel: string): LifecycleDetail[] {
  const details: LifecycleDetail[] = [];
  if (ctx.localName?.trim()) details.push({ label: 'Local', value: ctx.localName.trim() });
  details.push({ label: ctx.isCourtesy ? 'Campaña' : 'Descuento', value: ctx.title });
  if (ctx.isCourtesy) {
    details.push({
      label: 'Beneficio',
      value: resolveCourtesyBenefitLabel({ discountLabel: ctx.courtesyLabel }, ctx.title),
    });
    if (ctx.recipientCount != null) {
      details.push({ label: 'Destinatarios', value: String(ctx.recipientCount) });
    }
  } else if (ctx.discountType && ctx.discountValue != null && ctx.discountValue > 0) {
    details.push({
      label: 'Beneficio',
      value: formatDiscountVisualBenefit(ctx.discountType, ctx.discountValue),
    });
  }
  details.push({ label: 'Vigencia', value: validityLabel(ctx) });
  details.push({ label: 'Estado', value: statusLabel });
  return details;
}

function recipientsPhrase(count: number | null | undefined): string {
  if (count == null) return 'los destinatarios';
  return count === 1 ? '1 destinatario' : `${count} destinatarios`;
}

export function buildDiscountLifecycleContent(
  ctx: DiscountLifecycleContext,
): DiscountLifecycleContent {
  const name = ctx.title.trim() || (ctx.isCourtesy ? 'tu cortesía' : 'tu descuento');
  const local = ctx.localName?.trim() ? ` de ${ctx.localName.trim()}` : '';
  const reason = ctx.reason?.trim();
  const extra = reason ? ` Motivo: ${reason}` : '';

  if (ctx.event === 'expired') {
    return {
      title: 'Descuento vencido',
      body: `«${name}» venció. Queda en tu historial; no se borran claims ni métricas.`,
      details: [],
    };
  }

  // ---- edits keep their dedicated (discount-only) copy ------------------------------
  if (ctx.aspect === 'edit') {
    if (ctx.event === 'pending') {
      return {
        title: 'Edición enviada a revisión',
        body: `Los cambios de «${name}» están en revisión. La versión publicada sigue activa.`,
        details: [],
      };
    }
    if (ctx.event === 'approved') {
      return {
        title: 'Edición de descuento aprobada',
        body: `Los cambios de «${name}» ya están publicados.`,
        details: [],
      };
    }
    return {
      title: 'Edición de descuento rechazada',
      body: `Los cambios de «${name}» fueron rechazados. Sigue publicada la versión anterior.${extra}`,
      details: reason ? [{ label: 'Motivo', value: reason }] : [],
    };
  }

  // ---- courtesy ---------------------------------------------------------------------
  if (ctx.isCourtesy) {
    if (ctx.event === 'pending') {
      return {
        title: 'Solicitud de cortesía recibida',
        body:
          `Recibimos tu solicitud de cortesía «${name}»${local}. Está pendiente de aprobación: ` +
          `todavía no se envió ningún QR a ${recipientsPhrase(ctx.recipientCount)}.`,
        details: baseDetails(ctx, 'Pendiente de aprobación'),
      };
    }
    if (ctx.event === 'approved') {
      return {
        title: 'Cortesía aprobada',
        body:
          `Tu cortesía «${name}»${local} fue aprobada y se entrega a ` +
          `${recipientsPhrase(ctx.recipientCount)}.`,
        details: [...baseDetails(ctx, 'Aprobada'), ...buildAgreementDetails(ctx.agreement)],
      };
    }
    const details = baseDetails(ctx, 'Rechazada');
    if (reason) details.push({ label: 'Motivo', value: reason });
    return {
      title: 'Cortesía rechazada',
      body: `Tu solicitud de cortesía «${name}»${local} fue rechazada. No se envió ningún QR.${extra}`,
      details,
    };
  }

  // ---- normal discount --------------------------------------------------------------
  if (ctx.event === 'pending') {
    return {
      title: 'Descuento enviado a revisión',
      body: `«${name}» fue enviado a revisión. Te avisamos cuando administración lo apruebe o rechace.`,
      details: [],
    };
  }
  if (ctx.event === 'approved') {
    return {
      title: 'Descuento aprobado',
      body: `«${name}» fue aprobado y ya puede mostrarse y canjearse.`,
      details: [...baseDetails(ctx, 'Aprobado'), ...buildAgreementDetails(ctx.agreement)],
    };
  }
  return {
    title: 'Descuento rechazado',
    body: `«${name}» fue rechazado.${extra}`,
    details: reason ? [{ label: 'Motivo', value: reason }] : [],
  };
}
