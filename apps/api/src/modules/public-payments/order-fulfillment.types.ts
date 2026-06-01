import type { OrderResponse } from '@yo-te-invito/shared';

export type FulfillPaidOrderSource =
  | 'DEMO_CONFIRM'
  | 'GETNET_POLL'
  | 'GETNET_WEBHOOK'
  | 'MANUAL_RECONCILIATION';

export type FulfillPaidOrderOutcome =
  | 'fulfilled'
  | 'alreadyFulfilled'
  | 'skipped'
  | 'error';

export interface FulfillPaidOrderInput {
  tenantId: string;
  orderId: string;
  paymentId: string;
  source: FulfillPaidOrderSource;
  /**
   * When true (default), expired `PENDING_PAYMENT` orders throw `ORDER_EXPIRED`.
   * When false, returns `skipped` instead (e.g. future reconciliation).
   */
  rejectIfExpired?: boolean;
}

export interface FulfillPaidOrderResult {
  outcome: FulfillPaidOrderOutcome;
  order?: OrderResponse;
  ticketsCreated: number;
  newCommissionId?: string | null;
  errorMessage?: string;
}
