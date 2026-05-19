/**
 * Presets de tamaño + layouts por orientación (vertical centrado / horizontal dos columnas).
 * Coordenadas normalizadas 0–1; la zona QR se reclampa con las mismas reglas que el API.
 */

import { TICKET_TEMPLATE_DEFAULT_QR_ZONE } from '@yo-te-invito/shared';
import type { TicketTemplateElement } from '@yo-te-invito/shared';
import type { TicketStudioState } from './ticket-studio-defaults';
import { clampQrZone } from '@/lib/producer/ticket-studio-qr-rules';
import type { CanvasOrientation } from '@/lib/producer/ticket-studio-orientation';
import { getCanvasOrientation } from '@/lib/producer/ticket-studio-orientation';

export type TicketSizePreset = 'compact' | 'standard' | 'large';

/** Misma “clase” de superficie: portrait y landscape son el mismo par intercambiado. */
const DIMS: Record<TicketSizePreset, { portrait: { w: number; h: number } }> = {
  compact: { portrait: { w: 280, h: 520 } },
  standard: { portrait: { w: 320, h: 560 } },
  large: { portrait: { w: 360, h: 640 } },
};

/** Campos dinámicos que en horizontal van junto al QR (código / control). */
const LANDSCAPE_RIGHT_DYNAMIC_FIELDS = new Set(['ticketId', 'orderCode']);

export function inferSizePreset(state: Pick<TicketStudioState, 'canvasWidth' | 'canvasHeight'>): TicketSizePreset {
  const short = Math.min(state.canvasWidth, state.canvasHeight);
  const long = Math.max(state.canvasWidth, state.canvasHeight);
  if (long <= 530 && short <= 290) return 'compact';
  if (long >= 600 || short >= 370) return 'large';
  return 'standard';
}

export function getPresetDimensions(
  preset: TicketSizePreset,
  orientation: CanvasOrientation,
): { canvasWidth: number; canvasHeight: number } {
  const { w, h } = DIMS[preset].portrait;
  if (orientation === 'portrait') {
    return { canvasWidth: w, canvasHeight: h };
  }
  return { canvasWidth: h, canvasHeight: w };
}

/** Solo cambia píxeles; las posiciones normalizadas siguen válidas. */
export function applySizePreset(state: TicketStudioState, preset: TicketSizePreset): TicketStudioState {
  const o = getCanvasOrientation(state);
  const { canvasWidth, canvasHeight } = getPresetDimensions(preset, o);
  return {
    ...state,
    sizePreset: preset,
    canvasWidth,
    canvasHeight,
  };
}

function sortTextLike(elements: TicketTemplateElement[]): TicketTemplateElement[] {
  return elements
    .filter((e) => e.type === 'TEXT' || e.type === 'DYNAMIC')
    .sort((a, b) => a.zIndex - b.zIndex || a.y - b.y);
}

function patchEl(el: TicketTemplateElement, patch: Partial<TicketTemplateElement>): TicketTemplateElement {
  return { ...el, ...patch, style: patch.style ? { ...el.style, ...patch.style } : el.style };
}

/** Layout vertical: textos apilados arriba-centro; QR abajo (default compartido). */
export function assignPortraitLayout(state: TicketStudioState): TicketStudioState {
  const textLikes = sortTextLike(state.elementsJson);
  const ids = new Set(textLikes.map((e) => e.id));
  const qr = clampQrZone({ ...TICKET_TEMPLATE_DEFAULT_QR_ZONE });

  const hasImage = state.elementsJson.some((e) => e.type === 'LOGO' || e.type === 'IMAGE');
  const gap = 0.014;
  const maxContentBottom = qr.y - gap * 2;

  let y = hasImage ? 0.13 : 0.045;
  const repositionedTexts: TicketTemplateElement[] = [];
  for (const el of textLikes) {
    const h = Math.min(0.15, Math.max(0.048, el.h));
    const yy = Math.min(y, maxContentBottom - h);
    repositionedTexts.push(
      patchEl(el, {
        x: 0.06,
        y: yy,
        w: 0.88,
        h,
        style: {
          ...el.style,
          textAlign: el.style?.textAlign ?? 'center',
        },
      }),
    );
    y = yy + h + gap;
  }

  const lastTextBottom =
    repositionedTexts.length > 0
      ? Math.max(...repositionedTexts.map((e) => e.y + e.h))
      : hasImage
        ? 0.12
        : 0.08;

  const byId = new Map(repositionedTexts.map((e) => [e.id, e]));
  let imgPlaced = false;
  const rest = state.elementsJson.map((el) => {
    if (ids.has(el.id)) return byId.get(el.id)!;
    if (el.type === 'LOGO' || el.type === 'IMAGE') {
      const next = imgPlaced
        ? patchEl(el, { x: 0.28, y: 0.12, w: 0.44, h: 0.08 })
        : patchEl(el, { x: 0.28, y: 0.02, w: 0.44, h: 0.09, zIndex: Math.max(el.zIndex, 8) });
      imgPlaced = true;
      return next;
    }
    if (el.type === 'DIVIDER') {
      return patchEl(el, {
        x: 0.08,
        y: Math.min(lastTextBottom + gap, maxContentBottom - 0.02),
        w: 0.84,
        h: 0.008,
      });
    }
    if (el.type === 'SHAPE') {
      return patchEl(el, { x: 0.06, y: 0.46, w: 0.88, h: 0.04 });
    }
    return el;
  });

  return {
    ...state,
    qrZoneJson: qr,
    elementsJson: rest,
  };
}

/** Layout horizontal: columna izquierda (info) + derecha (QR + códigos). */
export function assignLandscapeLayout(state: TicketStudioState): TicketStudioState {
  const textLikes = sortTextLike(state.elementsJson);
  const leftFields: TicketTemplateElement[] = [];
  const rightFields: TicketTemplateElement[] = [];
  for (const el of textLikes) {
    if (
      el.type === 'DYNAMIC' &&
      el.fieldKey &&
      LANDSCAPE_RIGHT_DYNAMIC_FIELDS.has(el.fieldKey)
    ) {
      rightFields.push(el);
    } else {
      leftFields.push(el);
    }
  }

  const qrDraft = { x: 0.56, y: 0.1, w: 0.38, h: 0.58 };
  const qr = clampQrZone(qrDraft);

  const hasImage = state.elementsJson.some((e) => e.type === 'LOGO' || e.type === 'IMAGE');
  let y = hasImage ? 0.2 : 0.06;
  const gap = 0.012;
  const leftX = 0.05;
  const leftW = 0.48;
  const maxLeftY = 0.9;

  const leftPlaced = leftFields.map((el) => {
    const h = Math.min(0.14, Math.max(0.046, el.h));
    const row = patchEl(el, {
      x: leftX,
      y: Math.min(y, maxLeftY - h),
      w: leftW,
      h,
      style: {
        ...el.style,
        textAlign: 'left',
      },
    });
    y += h + gap;
    return row;
  });

  const leftColumnBottom =
    leftPlaced.length > 0 ? Math.max(...leftPlaced.map((e) => e.y + e.h)) : y;

  let ry = Math.min(qr.y + qr.h + gap, 0.72);
  const rightX = qr.x;
  const rightW = qr.w;
  const rightPlaced = rightFields.map((el) => {
    const h = Math.min(0.1, Math.max(0.04, el.h));
    const row = patchEl(el, {
      x: rightX,
      y: Math.min(ry, 0.92 - h),
      w: rightW,
      h,
      style: {
        ...el.style,
        textAlign: 'center',
        fontSize: Math.min(el.style?.fontSize ?? 11, 12),
      },
    });
    ry += h + gap;
    return row;
  });

  const placedIds = new Set([...leftPlaced, ...rightPlaced].map((e) => e.id));
  const byId = new Map([...leftPlaced, ...rightPlaced].map((e) => [e.id, e]));

  let imgPlaced = false;
  const rest = state.elementsJson.map((el) => {
    if (placedIds.has(el.id)) return byId.get(el.id)!;
    if (el.type === 'LOGO' || el.type === 'IMAGE') {
      if (!imgPlaced) {
        imgPlaced = true;
        return patchEl(el, {
          x: leftX,
          y: 0.035,
          w: 0.42,
          h: 0.12,
          zIndex: Math.max(el.zIndex, 9),
        });
      }
      return patchEl(el, {
        x: leftX,
        y: 0.16,
        w: 0.35,
        h: 0.1,
        zIndex: el.zIndex,
      });
    }
    if (el.type === 'DIVIDER') {
      return patchEl(el, {
        x: leftX,
        y: Math.min(leftColumnBottom + gap, 0.88),
        w: leftW,
        h: 0.006,
      });
    }
    if (el.type === 'SHAPE') {
      return patchEl(el, { x: leftX, y: 0.5, w: leftW, h: 0.06 });
    }
    return el;
  });

  return {
    ...state,
    qrZoneJson: qr,
    elementsJson: rest,
  };
}

/**
 * Cambia orientación, dimensiones según preset y aplica layout real (no solo swap).
 */
export function applyOrientationWithLayout(
  state: TicketStudioState,
  next: CanvasOrientation,
): TicketStudioState {
  const current = getCanvasOrientation(state);
  if (current === next) return state;

  const preset = state.sizePreset ?? inferSizePreset(state);
  const { canvasWidth, canvasHeight } = getPresetDimensions(preset, next);

  const base: TicketStudioState = {
    ...state,
    sizePreset: preset,
    canvasWidth,
    canvasHeight,
  };

  return next === 'landscape' ? assignLandscapeLayout(base) : assignPortraitLayout(base);
}
