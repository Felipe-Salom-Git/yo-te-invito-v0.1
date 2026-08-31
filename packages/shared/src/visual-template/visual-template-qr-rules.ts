import {
  VISUAL_TEMPLATE_QR_MIN_H,
  VISUAL_TEMPLATE_QR_MIN_W,
  VISUAL_TEMPLATE_QR_SAFE_MARGIN,
  type VisualTemplateQrZone,
} from './visual-template.schema';

export function assertVisualQrZoneSafe(qr: VisualTemplateQrZone): string | null {
  const { x, y, w, h } = qr;
  if (w < VISUAL_TEMPLATE_QR_MIN_W || h < VISUAL_TEMPLATE_QR_MIN_H) {
    return `La zona QR debe medir al menos ${VISUAL_TEMPLATE_QR_MIN_W}×${VISUAL_TEMPLATE_QR_MIN_H} (relativo al canvas).`;
  }
  if (x < VISUAL_TEMPLATE_QR_SAFE_MARGIN || y < VISUAL_TEMPLATE_QR_SAFE_MARGIN) {
    return 'La zona QR debe quedar dentro del margen seguro (no pegada al borde).';
  }
  if (
    x + w > 1 - VISUAL_TEMPLATE_QR_SAFE_MARGIN ||
    y + h > 1 - VISUAL_TEMPLATE_QR_SAFE_MARGIN
  ) {
    return 'La zona QR no puede salir del área segura del canvas.';
  }
  return null;
}

export function visualRectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

export function visualElementsHitQr(
  elements: Array<{ x: number; y: number; w: number; h: number }>,
  qr: VisualTemplateQrZone,
): boolean {
  return elements.some((el) => visualRectsIntersect(el, qr));
}

export function clampVisualQrZone(q: VisualTemplateQrZone): VisualTemplateQrZone {
  const margin = VISUAL_TEMPLATE_QR_SAFE_MARGIN;
  let w = Math.min(Math.max(q.w, VISUAL_TEMPLATE_QR_MIN_W), 1 - 2 * margin);
  let h = Math.min(Math.max(q.h, VISUAL_TEMPLATE_QR_MIN_H), 1 - 2 * margin);
  let x = Math.min(Math.max(q.x, margin), 1 - margin - w);
  let y = Math.min(Math.max(q.y, margin), 1 - margin - h);
  return { x, y, w, h };
}
