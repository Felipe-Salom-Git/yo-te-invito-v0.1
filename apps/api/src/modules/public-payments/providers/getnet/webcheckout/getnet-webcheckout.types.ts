export type GetnetWebCheckoutEnv = 'pre' | 'production' | 'sandbox';

export interface GetnetWebCheckoutConfig {
  env: GetnetWebCheckoutEnv;
  authBaseUrl: string;
  apiBaseUrl: string;
  paymentIntentPath: string;
  merchantId: string;
  sellerId: string;
  clientId: string;
  secretKey: string;
  scope: string;
  transactionChannelEntry: string;
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

export interface CreateWebCheckoutPaymentIntentInput {
  orderId: string;
  currency: string;
  amountMinor: number;
  successUrl: string;
  errorUrl: string;
  products: GetnetWebCheckoutProductLine[];
  expiresAt?: string;
}

export interface CreateWebCheckoutPaymentIntentResult {
  paymentIntentId: string;
  redirectUrl: string;
  raw: Record<string, unknown>;
}
