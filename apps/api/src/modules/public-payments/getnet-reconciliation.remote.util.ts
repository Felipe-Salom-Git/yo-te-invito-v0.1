import { loadGetnetConfig } from './providers/getnet/getnet.config';
import { loadGetnetWebCheckoutConfig } from './providers/getnet/webcheckout/getnet-webcheckout.config';

/** True when OAuth/client credentials are present for remote Getnet API calls. */
export function isGetnetRemoteConfigured(): boolean {
  return loadGetnetConfig().enabled || loadGetnetWebCheckoutConfig().enabled;
}

/**
 * Skip calling Getnet order-status API when credentials are missing or status was supplied.
 */
export function shouldSkipRemoteStatusFetch(
  remoteStatusOverride?: string,
): boolean {
  const override = remoteStatusOverride?.trim();
  if (override) return false;
  return !isGetnetRemoteConfigured();
}
