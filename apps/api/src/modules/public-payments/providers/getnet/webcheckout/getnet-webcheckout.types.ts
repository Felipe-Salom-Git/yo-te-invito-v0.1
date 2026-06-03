export type GetnetWebCheckoutEnv = 'pre' | 'production' | 'sandbox';

export interface GetnetWebCheckoutConfig {
  env: GetnetWebCheckoutEnv;
  authBaseUrl: string;
  webCheckoutBaseUrl: string;
  paymentIntentPath: string;
  /** Legacy full path under API base (no separate webcheckout base URL). */
  useLegacyFullPath: boolean;
  /** Optional — sent as `x-merchant-id` only when set. */
  merchantId?: string;
  sellerId: string;
  clientId: string;
  secretKey: string;
  scope: string;
  enabled: boolean;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface GetnetWebCheckoutProductLine {
  productType: string;
  title: string;
  description: string;
  valueMinor: number;
  quantity: number;
}

export interface WebCheckoutCustomerInput {
  customerId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  documentNumber: string;
}

export interface CreateWebCheckoutPaymentIntentInput {
  orderId: string;
  currency: string;
  amountMinor: number;
  products: GetnetWebCheckoutProductLine[];
  customer: WebCheckoutCustomerInput;
}

export interface CreateWebCheckoutPaymentIntentResult {
  paymentIntentId: string;
  redirectUrl: string;
  raw: Record<string, unknown>;
}
