import {
  formatGastroDiscountDateAr,
} from './gastro-discount-expiry';
import { GASTRO_WEEKDAY_LABELS_ES, type GastroWeekday } from './schemas/gastro-discounts';
import type {
  DiscountVisualDynamicFieldKey,
  DiscountVisualTemplateElement,
  UpsertGastroDiscountVisualTemplateDto,
} from './schemas/gastro-discount-visual-template.schema';
import { DISCOUNT_VISUAL_DEFAULT_QR_ZONE } from './schemas/gastro-discount-visual-template.schema';
import {
  assertVisualQrZoneSafe,
  visualElementsHitQr,
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

const FORBIDDEN_PAYLOAD = /yti:(gastro-discount|v1):/i;

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
  const elementsJson = dto.elementsJson ?? existing?.elementsJson ?? fallback.elementsJson;
  const qrZoneJson = dto.qrZoneJson ?? existing?.qrZoneJson ?? { ...DISCOUNT_VISUAL_DEFAULT_QR_ZONE };

  const qrMsg = assertVisualQrZoneSafe(qrZoneJson);
  if (qrMsg) throw new Error(qrMsg);
  if (visualElementsHitQr(elementsJson, qrZoneJson)) {
    throw new Error('Hay elementos superpuestos con la zona QR. Mové o achicá capas para dejar el código visible.');
  }
  const unsafe = assertDiscountVisualElementsSafe(elementsJson);
  if (unsafe) throw new Error(unsafe);
  if (backgroundType === 'IMAGE' && !/^https:\/\//i.test(backgroundValue)) {
    throw new Error('El fondo imagen debe ser URL HTTPS');
  }

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
