import type { GetnetWebCheckoutConfig, GetnetWebCheckoutEnv } from './getnet-webcheckout.types';

const URL_PRESETS: Record<
  GetnetWebCheckoutEnv,
  { authBaseUrl: string; apiBaseUrl: string; paymentIntentPath: string }
> = {
  pre: {
    authBaseUrl:
      'https://api.pre.globalgetnet.com/authentication/oauth2/access_token',
    apiBaseUrl: 'https://api.pre.globalgetnet.com',
    paymentIntentPath: '/dpy/web-checkout/v1/payment-intent',
  },
  sandbox: {
    authBaseUrl:
      'https://api-sbx.globalgetnet.com/authentication/oauth2/access_token',
    apiBaseUrl: 'https://api-sbx.globalgetnet.com',
    paymentIntentPath: '/dpy/web-checkout/v1/payment-intent',
  },
  production: {
    authBaseUrl:
      'https://api.globalgetnet.com/authentication/oauth2/access_token',
    apiBaseUrl: 'https://api.globalgetnet.com',
    paymentIntentPath: '/dpy/web-checkout/v1/payment-intent',
  },
};

function getEnv(name: string, fallback = ''): string {
  const v = process.env[name];
  return v != null && v.trim() !== '' ? v.trim() : fallback;
}

function resolveEnv(): GetnetWebCheckoutEnv {
  const raw = getEnv('GETNET_WEBCHECKOUT_ENV', 'pre').toLowerCase();
  if (raw === 'production' || raw === 'prod') return 'production';
  if (raw === 'sandbox' || raw === 'sbx') return 'sandbox';
  return 'pre';
}

export function loadGetnetWebCheckoutConfig(): GetnetWebCheckoutConfig {
  const env = resolveEnv();
  const preset = URL_PRESETS[env];

  const authBaseUrl =
    getEnv('GETNET_WEBCHECKOUT_AUTH_BASE_URL') || preset.authBaseUrl;
  const apiBaseUrl =
    getEnv('GETNET_WEBCHECKOUT_API_BASE_URL') || preset.apiBaseUrl;
  const paymentIntentPath =
    getEnv('GETNET_WEBCHECKOUT_PAYMENT_INTENT_PATH') ||
    preset.paymentIntentPath;

  const clientId = getEnv('GETNET_WEBCHECKOUT_CLIENT_ID');
  const secretKey = getEnv('GETNET_WEBCHECKOUT_SECRET_KEY');
  const sellerId = getEnv('GETNET_WEBCHECKOUT_SELLER_ID');
  const merchantId = getEnv('GETNET_WEBCHECKOUT_MERCHANT_ID');

  return {
    env,
    authBaseUrl: authBaseUrl.replace(/\/$/, ''),
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
    paymentIntentPath: paymentIntentPath.startsWith('/')
      ? paymentIntentPath
      : `/${paymentIntentPath}`,
    merchantId,
    sellerId,
    clientId,
    secretKey,
    scope: getEnv('GETNET_WEBCHECKOUT_SCOPE'),
    transactionChannelEntry: getEnv(
      'GETNET_WEBCHECKOUT_TRANSACTION_CHANNEL',
      'ECOMMERCE',
    ),
    enabled: Boolean(clientId && secretKey && sellerId),
    timeoutMs: 15000,
    maxRetries: 2,
    retryDelayMs: 500,
  };
}

export function buildWebCheckoutPaymentIntentUrl(
  config: GetnetWebCheckoutConfig,
): string {
  return `${config.apiBaseUrl.replace(/\/$/, '')}${config.paymentIntentPath}`;
}

/** True when payment metadata indicates Web Checkout Redirect integration. */
export function isWebCheckoutPaymentMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }
  return (metadata as Record<string, unknown>).getnetIntegration === 'webcheckout';
}
