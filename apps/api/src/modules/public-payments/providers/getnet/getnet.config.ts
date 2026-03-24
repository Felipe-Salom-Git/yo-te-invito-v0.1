/**
 * Getnet Checkout configuration — read from environment variables.
 * / Integración Getnet Checkout — configuración desde variables de entorno.
 */

export interface GetnetConfig {
  /** Auth server base URL (e.g. https://auth.preprod.geopagos.com) */
  authBaseUrl: string;
  /** Checkout API base URL (e.g. https://api-santander.preprod.geopagos.com) */
  checkoutBaseUrl: string;
  clientId: string;
  clientSecret: string;
  /** Whether Getnet provider is enabled (has valid credentials) */
  enabled: boolean;
  /** Token cache TTL buffer in seconds (refresh before expiry) */
  tokenBufferSeconds: number;
  /** HTTP timeout in ms */
  timeoutMs: number;
  /** Max retries for transient failures */
  maxRetries: number;
  /** Delay between retries in ms */
  retryDelayMs: number;
}

function getEnv(name: string, defaultValue?: string): string {
  const v = process.env[name];
  if (v != null && v.trim() !== '') return v.trim();
  return defaultValue ?? '';
}

export function loadGetnetConfig(): GetnetConfig {
  const authBaseUrl =
    getEnv('GETNET_AUTH_BASE_URL') || 'https://auth.preprod.geopagos.com';
  const checkoutBaseUrl =
    getEnv('GETNET_CHECKOUT_BASE_URL') || 'https://api-santander.preprod.geopagos.com';
  const clientId = getEnv('GETNET_CLIENT_ID');
  const clientSecret = getEnv('GETNET_CLIENT_SECRET');

  const hasCredentials = Boolean(clientId && clientSecret);

  return {
    authBaseUrl,
    checkoutBaseUrl,
    clientId,
    clientSecret,
    enabled: hasCredentials,
    tokenBufferSeconds: 60,
    timeoutMs: 15000,
    maxRetries: 2,
    retryDelayMs: 500,
  };
}
