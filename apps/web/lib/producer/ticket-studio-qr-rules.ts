/**
 * Client-side rules aligned with API `ProducerTicketTemplateService` (margins, min size).
 */

import type { TicketTemplateQrZoneClient } from '@/repositories/interfaces';

export const QR_SAFE_MARGIN = 0.04;
export const QR_MIN_W = 0.18;
export const QR_MIN_H = 0.18;

export function clampQrZone(q: TicketTemplateQrZoneClient): TicketTemplateQrZoneClient {
  let w = Math.min(Math.max(q.w, QR_MIN_W), 1 - 2 * QR_SAFE_MARGIN);
  let h = Math.min(Math.max(q.h, QR_MIN_H), 1 - 2 * QR_SAFE_MARGIN);
  let x = Math.min(Math.max(q.x, QR_SAFE_MARGIN), 1 - QR_SAFE_MARGIN - w);
  let y = Math.min(Math.max(q.y, QR_SAFE_MARGIN), 1 - QR_SAFE_MARGIN - h);
  return { x, y, w, h };
}

export function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

export function anyElementHitsQr(
  elements: Array<{ x: number; y: number; w: number; h: number }>,
  qr: TicketTemplateQrZoneClient,
): boolean {
  return elements.some((el) => rectsIntersect(el, qr));
}
