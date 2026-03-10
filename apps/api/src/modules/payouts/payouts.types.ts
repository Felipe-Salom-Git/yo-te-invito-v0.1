export type PayoutStatus = 'REQUESTED' | 'PENDING' | 'PROCESSING' | 'SENT' | 'REJECTED';

export interface PayoutRequest {
  id: string;
  tenantId: string;
  eventId: string;
  producerId: string;
  status: PayoutStatus;
  amountCents: number;
  bankInfo?: { titular?: string; banco?: string; cbu?: string };
  requestedByUserId: string;
  createdAt: string;
}
