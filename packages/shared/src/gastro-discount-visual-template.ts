import {
  formatGastroDiscountDateAr,
} from './gastro-discount-expiry';
import { GASTRO_WEEKDAY_LABELS_ES, type GastroWeekday } from './schemas/gastro-discounts';
import {
  DISCOUNT_VISUAL_DEFAULT_QR_ZONE,
  discountVisualTemplateElementSchema,
  gastroDiscountVisualTemplateResponseSchema,
  type DiscountVisualDynamicFieldKey,
  type DiscountVisualTemplateElement,
  type GastroDiscountVisualTemplateResponse,
  type UpsertGastroDiscountVisualTemplateDto,
} from './schemas/gastro-discount-visual-template.schema';
import {
  assertVisualQrZoneSafe,
  visualElementsHitQr,
  visualRectsIntersect,
} from './visual-template/visual-template-qr-rules';

export type DiscountVisualRenderContext = {
  gastroName: string;
  discountTitle: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  validityMode?: 'DATE_RANGE' | 'WEEKLY_RECURRING' | null;
  validWeekday?: GastroWeekday | null;
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  discountDate?: string | Date | null;
  shortCode?: string | null;
};

export function formatDiscountVisualBenefit(type: 'PERCENT' | 'FIXED', value: number): string {
  if (type === 'PERCENT') return `${value}%`;
  return `$${value}`;
}

/** Alias vertical-agnostic — misma regla PERCENT / FIXED. Gastro sigue usando `formatDiscountVisualBenefit`. */
export const formatCouponVisualBenefit = formatDiscountVisualBenefit;

export function formatDiscountVisualValidity(ctx: DiscountVisualRenderContext): string {
  if (ctx.validityMode === 'WEEKLY_RECURRING' && ctx.validWeekday) {
    const day = GASTRO_WEEKDAY_LABELS_ES[ctx.validWeekday] ?? ctx.validWeekday;
    const until = formatGastroDiscountDateAr(ctx.validTo);
    return until ? `Todos los ${day} · hasta ${until}` : `Todos los ${day}`;
  }
  const from = formatGastroDiscountDateAr(ctx.validFrom ?? ctx.discountDate);
  const to = formatGastroDiscountDateAr(ctx.validTo ?? ctx.discountDate);
  if (from && to && from !== to) return `${from} – ${to}`;
  if (to) return `Hasta ${to}`;
  if (from) return `Desde ${from}`;
  return 'Vigencia según el local';
}

export function resolveDiscountVisualField(
  key: DiscountVisualDynamicFieldKey,
  ctx: DiscountVisualRenderContext,
): string {
  switch (key) {
    case 'gastroName':
      return ctx.gastroName.trim() || 'Local';
    case 'discountTitle':
      return ctx.discountTitle.trim() || 'Descuento';
    case 'discountValue':
      return formatDiscountVisualBenefit(ctx.discountType, ctx.discountValue);
    case 'discountValidity':
      return formatDiscountVisualValidity(ctx);
    case 'shortCode':
      return (ctx.shortCode ?? '').trim() || '—';
    default:
      return '';
  }
}

const FORBIDDEN_PAYLOAD = /yti:(gastro-discount|activity-coupon|v1):/i;

export function discountVisualTextLooksLikePayload(text: string | undefined): boolean {
  if (!text) return false;
  return FORBIDDEN_PAYLOAD.test(text);
}

export function assertDiscountVisualElementsSafe(
  elements: DiscountVisualTemplateElement[],
): string | null {
  for (const el of elements) {
    if (discountVisualTextLooksLikePayload(el.content)) {
      return 'El texto no puede incluir un payload QR.';
    }
    if (el.imageUrl && !/^https:\/\//i.test(el.imageUrl)) {
      return 'Las imágenes del template deben ser URL HTTPS.';
    }
  }
  return null;
}

/** Bindings that a custom Gastro coupon must show. Not applied to TicketTemplate. */
export const DISCOUNT_VISUAL_REQUIRED_FIELD_KEYS = [
  'discountValue',
  'shortCode',
  'discountTitle',
] as const;

export type DiscountVisualRequiredFieldKey = (typeof DISCOUNT_VISUAL_REQUIRED_FIELD_KEYS)[number];

const CANONICAL_LABEL: Record<DiscountVisualRequiredFieldKey, string> = {
  discountValue: 'beneficio real (discountValue)',
  shortCode: 'código corto (shortCode)',
  discountTitle: 'título del descuento (discountTitle)',
};

const CANONICAL_MIN_W = 0.2;
const CANONICAL_MIN_H = 0.045;
const CANONICAL_MIN_FONT = 12;
const CANONICAL_MIN_OPACITY = 0.7;

function canonicalElementVisibilityError(
  el: DiscountVisualTemplateElement,
  others: DiscountVisualTemplateElement[],
): string | null {
  if (el.w < CANONICAL_MIN_W || el.h < CANONICAL_MIN_H) {
    return 'Un campo canónico es demasiado pequeño para leerse.';
  }
  if ((el.style?.opacity ?? 1) < CANONICAL_MIN_OPACITY) {
    return 'Un campo canónico no puede estar transparente.';
  }
  if ((el.style?.fontSize ?? 14) < CANONICAL_MIN_FONT) {
    return 'Un campo canónico tiene tipografía ilegible.';
  }
  if (el.rotation != null && Math.abs(el.rotation) > 5) {
    return 'Un campo canónico no puede rotarse.';
  }
  if (el.x + el.w < 0.08 || el.y + el.h < 0.04 || el.x > 0.92 || el.y > 0.96) {
    return 'Un campo canónico está fuera del área visible del cupón.';
  }
  for (const other of others) {
    if (other.id === el.id) continue;
    if (other.zIndex <= el.zIndex) continue;
    if (visualRectsIntersect(el, other)) {
      return 'Otra capa tapa un campo canónico (beneficio, título o código).';
    }
  }
  return null;
}

/**
 * Custom templates must keep a scannable QR plus visible canonical bindings.
 * Ticket templates are not subject to this rule.
 */
export function assertDiscountVisualCanonicalContent(
  elements: DiscountVisualTemplateElement[],
  qr: { x: number; y: number; w: number; h: number },
): string | null {
  const qrMsg = assertVisualQrZoneSafe(qr);
  if (qrMsg) return qrMsg;
  if (visualElementsHitQr(elements, qr)) {
    return 'Hay elementos superpuestos con la zona QR. Mové o achicá capas para dejar el código visible.';
  }
  for (const key of DISCOUNT_VISUAL_REQUIRED_FIELD_KEYS) {
    const matches = elements.filter((e) => e.type === 'DYNAMIC' && e.fieldKey === key);
    if (matches.length === 0) {
      return `El diseño debe mostrar el ${CANONICAL_LABEL[key]}.`;
    }
    const readable = matches.some((el) => canonicalElementVisibilityError(el, elements) === null);
    if (!readable) {
      return (
        canonicalElementVisibilityError(matches[0]!, elements) ??
        `El ${CANONICAL_LABEL[key]} debe permanecer visible.`
      );
    }
  }
  return null;
}

function dyn(
  id: string,
  fieldKey: DiscountVisualDynamicFieldKey,
  x: number,
  y: number,
  w: number,
  h: number,
  zIndex: number,
  style: DiscountVisualTemplateElement['style'],
): DiscountVisualTemplateElement {
  return { id, type: 'DYNAMIC', x, y, w, h, zIndex, fieldKey, style };
}

function text(
  id: string,
  content: string,
  x: number,
  y: number,
  w: number,
  h: number,
  zIndex: number,
  style: DiscountVisualTemplateElement['style'],
): DiscountVisualTemplateElement {
  return { id, type: 'TEXT', x, y, w, h, zIndex, content, style };
}

/** Fallback producto — dark/premium. No se persiste; se usa si no hay template custom. */
export function defaultDiscountVisualTemplateDesign(): Required<
  Pick<
    UpsertGastroDiscountVisualTemplateDto,
    | 'name'
    | 'canvasWidth'
    | 'canvasHeight'
    | 'backgroundType'
    | 'backgroundValue'
    | 'elementsJson'
    | 'qrZoneJson'
  >
> {
  return {
    name: 'Clásico Yo Te Invito',
    canvasWidth: 320,
    canvasHeight: 560,
    backgroundType: 'SOLID',
    backgroundValue: '#0a0a0a',
    qrZoneJson: { ...DISCOUNT_VISUAL_DEFAULT_QR_ZONE },
    elementsJson: [
      text('t-brand', 'YO TE INVITO', 0.08, 0.04, 0.84, 0.05, 2, {
        fontSize: 11,
        fontWeight: '600',
        color: '#16a34a',
        textAlign: 'center',
      }),
      dyn('d-value', 'discountValue', 0.08, 0.11, 0.84, 0.1, 3, {
        fontSize: 28,
        fontWeight: '700',
        color: '#fafafa',
        textAlign: 'center',
      }),
      dyn('d-title', 'discountTitle', 0.08, 0.22, 0.84, 0.08, 4, {
        fontSize: 16,
        fontWeight: '600',
        color: '#e5e5e5',
        textAlign: 'center',
      }),
      dyn('d-gastro', 'gastroName', 0.08, 0.31, 0.84, 0.06, 5, {
        fontSize: 13,
        color: '#a3a3a3',
        textAlign: 'center',
      }),
      dyn('d-valid', 'discountValidity', 0.08, 0.38, 0.84, 0.06, 6, {
        fontSize: 12,
        color: '#737373',
        textAlign: 'center',
      }),
      dyn('d-code', 'shortCode', 0.2, 0.88, 0.6, 0.06, 7, {
        fontSize: 14,
        fontWeight: '600',
        color: '#fafafa',
        textAlign: 'center',
      }),
    ],
  };
}

export type DiscountVisualPresetId = 'classic' | 'minimal' | 'premium' | 'promo';

export const DISCOUNT_VISUAL_PRESET_META: Array<{
  id: DiscountVisualPresetId;
  label: string;
}> = [
  { id: 'classic', label: 'Clásico' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'premium', label: 'Premium' },
  { id: 'promo', label: 'Promoción' },
];

export function discountVisualPresetDesign(
  id: DiscountVisualPresetId,
): ReturnType<typeof defaultDiscountVisualTemplateDesign> {
  const base = defaultDiscountVisualTemplateDesign();
  if (id === 'classic') return { ...base, name: 'Clásico' };
  if (id === 'minimal') {
    return {
      ...base,
      name: 'Minimal',
      backgroundValue: '#171717',
      elementsJson: [
        dyn('d-title', 'discountTitle', 0.08, 0.08, 0.84, 0.1, 3, {
          fontSize: 18,
          fontWeight: '600',
          color: '#fafafa',
          textAlign: 'center',
        }),
        dyn('d-value', 'discountValue', 0.08, 0.2, 0.84, 0.08, 4, {
          fontSize: 22,
          fontWeight: '700',
          color: '#16a34a',
          textAlign: 'center',
        }),
        dyn('d-gastro', 'gastroName', 0.08, 0.3, 0.84, 0.06, 5, {
          fontSize: 12,
          color: '#a3a3a3',
          textAlign: 'center',
        }),
        dyn('d-code', 'shortCode', 0.2, 0.88, 0.6, 0.06, 6, {
          fontSize: 13,
          fontWeight: '600',
          color: '#e5e5e5',
          textAlign: 'center',
        }),
      ],
    };
  }
  if (id === 'premium') {
    return {
      ...base,
      name: 'Premium',
      backgroundValue: '#111827',
      elementsJson: [
        text('t-brand', 'CUPÓN', 0.08, 0.05, 0.84, 0.04, 2, {
          fontSize: 10,
          fontWeight: '600',
          color: '#d4af37',
          textAlign: 'center',
        }),
        dyn('d-gastro', 'gastroName', 0.08, 0.1, 0.84, 0.06, 3, {
          fontSize: 12,
          color: '#e5e5e5',
          textAlign: 'center',
        }),
        dyn('d-value', 'discountValue', 0.08, 0.18, 0.84, 0.1, 4, {
          fontSize: 30,
          fontWeight: '700',
          color: '#fafafa',
          textAlign: 'center',
        }),
        dyn('d-title', 'discountTitle', 0.08, 0.3, 0.84, 0.08, 5, {
          fontSize: 15,
          color: '#d4d4d4',
          textAlign: 'center',
        }),
        dyn('d-valid', 'discountValidity', 0.08, 0.39, 0.84, 0.06, 6, {
          fontSize: 11,
          color: '#9ca3af',
          textAlign: 'center',
        }),
        dyn('d-code', 'shortCode', 0.2, 0.88, 0.6, 0.06, 7, {
          fontSize: 14,
          fontWeight: '600',
          color: '#d4af37',
          textAlign: 'center',
        }),
      ],
    };
  }
  return {
    ...base,
    name: 'Promoción',
    backgroundValue: '#14532d',
    elementsJson: [
      dyn('d-value', 'discountValue', 0.08, 0.08, 0.84, 0.12, 3, {
        fontSize: 32,
        fontWeight: '700',
        color: '#bbf7d0',
        textAlign: 'center',
      }),
      dyn('d-title', 'discountTitle', 0.08, 0.22, 0.84, 0.08, 4, {
        fontSize: 16,
        fontWeight: '600',
        color: '#fafafa',
        textAlign: 'center',
      }),
      text('t-cta', 'Presentá este QR en el local', 0.08, 0.32, 0.84, 0.06, 5, {
        fontSize: 12,
        color: '#bbf7d0',
        textAlign: 'center',
      }),
      dyn('d-gastro', 'gastroName', 0.08, 0.39, 0.84, 0.05, 6, {
        fontSize: 13,
        color: '#dcfce7',
        textAlign: 'center',
      }),
      dyn('d-code', 'shortCode', 0.2, 0.88, 0.6, 0.06, 7, {
        fontSize: 14,
        fontWeight: '700',
        color: '#fafafa',
        textAlign: 'center',
      }),
    ],
  };
}

export function mapDiscountVisualTemplateRow(row: {
  id: string;
  tenantId: string;
  gastroDiscountId: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundType: string;
  backgroundValue: string;
  elementsJson: unknown;
  qrZoneJson: unknown;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}): GastroDiscountVisualTemplateResponse | null {
  const elements = Array.isArray(row.elementsJson)
    ? row.elementsJson
        .map((item) => discountVisualTemplateElementSchema.safeParse(item))
        .filter((p): p is { success: true; data: DiscountVisualTemplateElement } => p.success)
        .map((p) => p.data)
    : [];
  const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : d);
  const parsed = gastroDiscountVisualTemplateResponseSchema.safeParse({
    id: row.id,
    tenantId: row.tenantId,
    gastroDiscountId: row.gastroDiscountId,
    name: row.name,
    canvasWidth: row.canvasWidth,
    canvasHeight: row.canvasHeight,
    backgroundType: row.backgroundType,
    backgroundValue: row.backgroundValue,
    elementsJson: elements,
    qrZoneJson: row.qrZoneJson,
    version: row.version,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  });
  if (!parsed.success) return null;
  if (assertDiscountVisualCanonicalContent(parsed.data.elementsJson, parsed.data.qrZoneJson)) {
    return null;
  }
  return parsed.data;
}

export function compileDiscountVisualTemplateDesign(
  dto: UpsertGastroDiscountVisualTemplateDto,
  existing?: {
    name: string;
    canvasWidth: number;
    canvasHeight: number;
    backgroundType: string;
    backgroundValue: string;
    elementsJson: DiscountVisualTemplateElement[];
    qrZoneJson: { x: number; y: number; w: number; h: number };
  } | null,
): {
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundType: 'SOLID' | 'IMAGE';
  backgroundValue: string;
  elementsJson: DiscountVisualTemplateElement[];
  qrZoneJson: { x: number; y: number; w: number; h: number };
} {
  const fallback = defaultDiscountVisualTemplateDesign();
  const name = dto.name ?? existing?.name ?? fallback.name;
  const canvasWidth = dto.canvasWidth ?? existing?.canvasWidth ?? fallback.canvasWidth;
  const canvasHeight = dto.canvasHeight ?? existing?.canvasHeight ?? fallback.canvasHeight;
  const backgroundType = (dto.backgroundType ??
    existing?.backgroundType ??
    fallback.backgroundType) as 'SOLID' | 'IMAGE';
  const backgroundValue =
    dto.backgroundValue ?? existing?.backgroundValue ?? fallback.backgroundValue;
  const elementsJson = (dto.elementsJson ?? existing?.elementsJson ?? fallback.elementsJson).map(
    (el) => (el.type === 'DYNAMIC' ? { ...el, content: undefined } : el),
  );
  const qrZoneJson = dto.qrZoneJson ?? existing?.qrZoneJson ?? { ...DISCOUNT_VISUAL_DEFAULT_QR_ZONE };

  const unsafe = assertDiscountVisualElementsSafe(elementsJson);
  if (unsafe) throw new Error(unsafe);
  if (backgroundType === 'IMAGE' && !/^https:\/\//i.test(backgroundValue)) {
    throw new Error('El fondo imagen debe ser URL HTTPS');
  }
  const canonical = assertDiscountVisualCanonicalContent(elementsJson, qrZoneJson);
  if (canonical) throw new Error(canonical);

  return {
    name,
    canvasWidth,
    canvasHeight,
    backgroundType,
    backgroundValue,
    elementsJson,
    qrZoneJson,
  };
}

export const DISCOUNT_VISUAL_STUDIO_PREVIEW_CONTEXT: DiscountVisualRenderContext = {
  gastroName: 'Restaurante Ejemplo',
  discountTitle: 'Promo almuerzo',
  discountType: 'PERCENT',
  discountValue: 20,
  validityMode: 'DATE_RANGE',
  validTo: '2026-09-30T02:59:59.000Z',
  shortCode: 'ABC-123',
};
