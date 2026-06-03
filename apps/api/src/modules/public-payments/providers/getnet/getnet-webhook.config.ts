import { loadGetnetConfig } from './getnet.config';
import { loadGetnetWebCheckoutConfig } from './webcheckout/getnet-webcheckout.config';

function getEnv(name: string, defaultValue?: string): string {
  const v = process.env[name];
  if (v != null && v.trim() !== '') return v.trim();
  return defaultValue ?? '';
}

export type GetnetWebhookAuthMode = 'header' | 'basic';

export interface GetnetWebhookConfig {
  authMode: GetnetWebhookAuthMode;
  /** Shared secret sent by Getnet (or reverse proxy) in a header */
  secret: string;
  /** Header name to read (default `x-getnet-webhook-secret`) */
  headerName: string;
  basicUser: string;
  basicPassword: string;
  /** When true, missing auth rejects webhooks (production or Getnet enabled) */
  requireSecret: boolean;
}

export function loadGetnetWebhookConfig(): GetnetWebhookConfig {
  const getnet = loadGetnetConfig();
  const webCheckout = loadGetnetWebCheckoutConfig();
  const nodeEnv = getEnv('NODE_ENV', 'development').toLowerCase();
  const requireSecret =
    nodeEnv === 'production' ||
    getEnv('GETNET_WEBHOOK_REQUIRE_SECRET', '') === 'true' ||
    getnet.enabled ||
    webCheckout.enabled;

  const authModeRaw = getEnv('GETNET_WEBHOOK_AUTH_MODE', 'header').toLowerCase();
  const authMode: GetnetWebhookAuthMode =
    authModeRaw === 'basic' ? 'basic' : 'header';

  return {
    authMode,
    secret: getEnv('GETNET_WEBHOOK_SECRET'),
    headerName: getEnv(
      'GETNET_WEBHOOK_HEADER_NAME',
      'x-getnet-webhook-secret',
    ).toLowerCase(),
    basicUser: getEnv('GETNET_WEBHOOK_BASIC_USER'),
    basicPassword: getEnv('GETNET_WEBHOOK_BASIC_PASSWORD'),
    requireSecret,
  };
}
