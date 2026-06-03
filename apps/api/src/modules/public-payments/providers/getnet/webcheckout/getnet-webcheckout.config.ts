import type { GetnetWebCheckoutConfig, GetnetWebCheckoutEnv } from './getnet-webcheckout.types';

type EnvPreset = {
  authBaseUrl: string;
  webCheckoutBaseUrl: string;
  paymentIntentPath: string;
};

const URL_PRESETS: Record<GetnetWebCheckoutEnv, EnvPreset> = {
  pre: {
    authBaseUrl:
      'https://api.pre.globalgetnet.com/authentication/oauth2/access_token',
    webCheckoutBaseUrl: 'https://api.pre.globalgetnet.com/dpy/web-checkout/v1',
    paymentIntentPath: '/payment-intent',
  },
  sandbox: {
    authBaseUrl:
      'https://api-sbx.globalgetnet.com/authentication/oauth2/access_token',
    webCheckoutBaseUrl: 'https://api-sbx.globalgetnet.com/dpy/web-checkout/v1',
    paymentIntentPath: '/payment-intent',
  },
  production: {
    authBaseUrl:
      'https://api.globalgetnet.com/authentication/oauth2/access_token',
    webCheckoutBaseUrl: 'https://api.globalgetnet.com/dpy/web-checkout/v1',
    paymentIntentPath: '/payment-intent',
  },
};

function getEnv(name: string, fallback = ''): string {
  const v = process.env[name];
  return v != null && v.trim() !== '' ? v.trim() : fallback;
}

/** GETNET_WEBCHECKOUT_* first, then GETNET_GLOBAL_* fallback. */
function envFirst(webKey: string, globalKey: string, fallback = ''): string {
  return getEnv(webKey) || getEnv(globalKey) || fallback;
}

function resolveEnv(): GetnetWebCheckoutEnv {
  const raw = (
    getEnv('GETNET_WEBCHECKOUT_ENV') || getEnv('GETNET_GLOBAL_ENV') || 'pre'
  ).toLowerCase();
  if (raw === 'production' || raw === 'prod') return 'production';
  if (raw === 'sandbox' || raw === 'sbx') return 'sandbox';
  return 'pre';
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function loadGetnetWebCheckoutConfig(): GetnetWebCheckoutConfig {
  const env = resolveEnv();
  const preset = URL_PRESETS[env];

  const authBaseUrl =
    envFirst(
      'GETNET_WEBCHECKOUT_AUTH_BASE_URL',
      'GETNET_GLOBAL_AUTH_BASE_URL',
      preset.authBaseUrl,
    ).replace(/\/$/, '');

  const webCheckoutBaseUrl = envFirst(
    'GETNET_WEBCHECKOUT_WEBCHECKOUT_BASE_URL',
    'GETNET_GLOBAL_WEBCHECKOUT_BASE_URL',
    preset.webCheckoutBaseUrl,
  ).replace(/\/$/, '');

  const paymentIntentPathRaw = envFirst(
    'GETNET_WEBCHECKOUT_PAYMENT_INTENT_PATH',
    'GETNET_GLOBAL_PAYMENT_INTENT_PATH',
    preset.paymentIntentPath,
  );
  const paymentIntentPath = normalizePath(paymentIntentPathRaw);

  const clientId = envFirst(
    'GETNET_WEBCHECKOUT_CLIENT_ID',
    'GETNET_GLOBAL_CLIENT_ID',
  );
  const secretKey = envFirst(
    'GETNET_WEBCHECKOUT_SECRET_KEY',
    'GETNET_GLOBAL_SECRET_KEY',
  );
  const sellerId = envFirst(
    'GETNET_WEBCHECKOUT_SELLER_ID',
    'GETNET_GLOBAL_SELLER_ID',
  );
  const merchantIdRaw = envFirst(
    'GETNET_WEBCHECKOUT_MERCHANT_ID',
    'GETNET_GLOBAL_MERCHANT_ID',
  );
  const merchantId = merchantIdRaw || undefined;

  /** Legacy: full path `/dpy/web-checkout/v1/payment-intent` via API base only. */
  const legacyApiBaseUrl = envFirst(
    'GETNET_WEBCHECKOUT_API_BASE_URL',
    'GETNET_GLOBAL_API_BASE_URL',
  ).replace(/\/$/, '');
  const useLegacyFullPath =
    !envFirst('GETNET_WEBCHECKOUT_WEBCHECKOUT_BASE_URL', 'GETNET_GLOBAL_WEBCHECKOUT_BASE_URL') &&
    paymentIntentPath.includes('/dpy/') &&
    Boolean(legacyApiBaseUrl);

  return {
    env,
    authBaseUrl,
    webCheckoutBaseUrl: useLegacyFullPath
      ? legacyApiBaseUrl
      : webCheckoutBaseUrl,
    paymentIntentPath,
    useLegacyFullPath,
    ...(merchantId ? { merchantId } : {}),
    sellerId,
    clientId,
    secretKey,
    scope: getEnv('GETNET_WEBCHECKOUT_SCOPE'),
    enabled: Boolean(
      clientId && secretKey && sellerId && authBaseUrl && webCheckoutBaseUrl,
    ),
    timeoutMs: 15000,
    maxRetries: 2,
    retryDelayMs: 500,
  };
}

export function buildWebCheckoutPaymentIntentUrl(
  config: GetnetWebCheckoutConfig,
): string {
  const base = config.webCheckoutBaseUrl.replace(/\/$/, '');
  const path = config.paymentIntentPath;
  if (config.useLegacyFullPath) {
    return `${base}${path}`;
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** True when payment metadata indicates Web Checkout Redirect integration. */
export function isWebCheckoutPaymentMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }
  return (metadata as Record<string, unknown>).getnetIntegration === 'webcheckout';
}
