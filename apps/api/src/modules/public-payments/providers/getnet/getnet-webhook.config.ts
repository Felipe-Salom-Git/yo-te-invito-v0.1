import { loadGetnetConfig } from './getnet.config';

function getEnv(name: string, defaultValue?: string): string {
  const v = process.env[name];
  if (v != null && v.trim() !== '') return v.trim();
  return defaultValue ?? '';
}

export interface GetnetWebhookConfig {
  /** Shared secret sent by Getnet (or reverse proxy) in a header */
  secret: string;
  /** Header name to read (default `x-getnet-webhook-secret`) */
  headerName: string;
  /** When true, missing secret rejects webhooks (production or Getnet enabled) */
  requireSecret: boolean;
}

export function loadGetnetWebhookConfig(): GetnetWebhookConfig {
  const getnet = loadGetnetConfig();
  const nodeEnv = getEnv('NODE_ENV', 'development').toLowerCase();
  const requireSecret =
    nodeEnv === 'production' || getEnv('GETNET_WEBHOOK_REQUIRE_SECRET', '') === 'true' || getnet.enabled;

  return {
    secret: getEnv('GETNET_WEBHOOK_SECRET'),
    headerName: getEnv('GETNET_WEBHOOK_HEADER_NAME', 'x-getnet-webhook-secret').toLowerCase(),
    requireSecret,
  };
}
