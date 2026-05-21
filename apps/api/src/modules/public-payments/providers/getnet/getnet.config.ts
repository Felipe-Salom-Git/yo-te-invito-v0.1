/**
 * Getnet Checkout configuration — read from environment variables.
 * Official env URLs: https://developers-sdk-documentation-site-santander.preprod.geopagos.com/page/environments
 */

export interface GetnetConfig {
  /** Auth server base URL (e.g. https://auth.stg.geopagos.io) */
  authBaseUrl: string;
  /** Checkout API base URL (e.g. https://api-mpos-santander.stg.geopagos.io) */
  checkoutBaseUrl: string;
  clientId: string;
  clientSecret: string;
  /** OAuth scope — `*` or `api_orders_post` per Getnet docs */
  scope: string;
  /** Whether Getnet provider is enabled (has valid credentials) */
  enabled: boolean;
  tokenBufferSeconds: number;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

const GETNET_URL_PRESETS = {
  staging: {
    authBaseUrl: 'https://auth.stg.geopagos.io',
    checkoutBaseUrl: 'https://api-mpos-santander.stg.geopagos.io',
  },
  production: {
    authBaseUrl: 'https://auth.prd.geopagos.io',
    checkoutBaseUrl: 'https://api.globalgetnet.com.ar',
  },
} as const;

function getEnv(name: string, defaultValue?: string): string {
  const v = process.env[name];
  if (v != null && v.trim() !== '') return v.trim();
  return defaultValue ?? '';
}

function resolvePreset(): (typeof GETNET_URL_PRESETS)[keyof typeof GETNET_URL_PRESETS] {
  const raw = getEnv('GETNET_ENV', 'staging').toLowerCase();
  return raw === 'production' || raw === 'prod'
    ? GETNET_URL_PRESETS.production
    : GETNET_URL_PRESETS.staging;
}

export function loadGetnetConfig(): GetnetConfig {
  const preset = resolvePreset();
  const authBaseUrl = getEnv('GETNET_AUTH_BASE_URL') || preset.authBaseUrl;
  const checkoutBaseUrl = getEnv('GETNET_CHECKOUT_BASE_URL') || preset.checkoutBaseUrl;
  const clientId = getEnv('GETNET_CLIENT_ID');
  const clientSecret = getEnv('GETNET_CLIENT_SECRET');
  const scope = getEnv('GETNET_SCOPE', '*');

  return {
    authBaseUrl,
    checkoutBaseUrl,
    clientId,
    clientSecret,
    scope,
    enabled: Boolean(clientId && clientSecret),
    tokenBufferSeconds: 60,
    timeoutMs: 15000,
    maxRetries: 2,
    retryDelayMs: 500,
  };
}
