/** Base URL for buyer-facing web app (checkout return links). */
export function getWebAppBaseUrl(): string {
  return (
    process.env.WEB_APP_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

export function buildCheckoutReturnUrl(input: {
  orderId: string;
  paymentId: string;
  tenantId?: string;
  cancelled?: boolean;
}): string {
  const q = new URLSearchParams({
    orderId: input.orderId,
    paymentId: input.paymentId,
    provider: 'getnet',
  });
  if (input.tenantId) {
    q.set('tenantId', input.tenantId);
  }
  if (input.cancelled) {
    q.set('cancelled', '1');
  }
  return `${getWebAppBaseUrl()}/checkout/return?${q.toString()}`;
}

export function buildEventCheckoutUrl(input: {
  eventId: string;
  orderId: string;
  tenantId: string;
}): string {
  const q = new URLSearchParams({
    tenantId: input.tenantId,
    orderId: input.orderId,
  });
  return `${getWebAppBaseUrl()}/checkout/${encodeURIComponent(input.eventId)}?${q.toString()}`;
}
