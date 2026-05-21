import { randomBytes } from 'crypto';

export function generateTicketQrPayload(): string {
  return `yti:v1:${randomBytes(24).toString('hex')}`;
}
