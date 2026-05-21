/** Minimum rendered QR edge length (px) for reliable scan and print. */
export const MIN_QR_DISPLAY_PX = 200;

export const QR_PAYLOAD_PREFIX = 'yti:v1:';

export function isValidTicketQrPayload(payload: string): boolean {
  return typeof payload === 'string' && payload.startsWith(QR_PAYLOAD_PREFIX) && payload.length > 12;
}

/** Compute QR pixel size from template canvas and normalized zone. */
export function qrPixelSizeFromZone(
  canvasWidth: number,
  canvasHeight: number,
  zoneW: number,
  zoneH: number,
): number {
  const shortSide = Math.min(canvasWidth, canvasHeight);
  const zoneMin = Math.min(zoneW, zoneH);
  const raw = Math.round(shortSide * zoneMin * 1.15);
  return Math.max(MIN_QR_DISPLAY_PX, Math.min(raw, 400));
}
