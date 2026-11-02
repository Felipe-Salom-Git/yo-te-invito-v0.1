/**
 * G12.1-A — Copy and timing for the "preparing your QR" overlay.
 * G12.1-A — Textos y tiempos del overlay "preparando tu QR".
 */

export const QR_PREPARING_MODE = {
  /** Only generates the QR (claim, Studio). */
  CREATE: 'create',
  /** Generates the QR and then emails it (courtesies, admin send). */
  CREATE_AND_SEND: 'create-and-send',
} as const;

export type QrPreparingMode = (typeof QR_PREPARING_MODE)[keyof typeof QR_PREPARING_MODE];

export const QR_PREPARING_CREATE_MESSAGE = 'Creando tu QR…';
export const QR_PREPARING_SEND_MESSAGE = 'Preparando el envío…';

/** After this delay a send flow switches from "creating" to "preparing the send". */
export const QR_PREPARING_SEND_STEP_MS = 1500;

export function resolveQrPreparingMessage(mode: QrPreparingMode, elapsedMs: number): string {
  if (mode === QR_PREPARING_MODE.CREATE_AND_SEND && elapsedMs >= QR_PREPARING_SEND_STEP_MS) {
    return QR_PREPARING_SEND_MESSAGE;
  }
  return QR_PREPARING_CREATE_MESSAGE;
}

/**
 * Overlay visibility for a mutation. Claims that redirect on success keep it until the
 * route changes (the component unmounts), so the form never flashes back between both.
 */
export function isQrPreparingVisible(
  state: { isPending: boolean; isSuccess: boolean },
  options: { keepOnSuccess?: boolean } = {},
): boolean {
  if (state.isPending) return true;
  return Boolean(options.keepOnSuccess && state.isSuccess);
}
