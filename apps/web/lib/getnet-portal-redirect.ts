/** Build query string from Next.js searchParams (portal fixed URLs → modern return). */
export function searchParamsToQueryString(
  params: Record<string, string | string[] | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== undefined) qs.append(key, v);
      }
    } else if (value !== '') {
      qs.set(key, value);
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/** Demo guest cart uses comma-separated `orderIds`; keep legacy success UI. */
export function isDemoCheckoutSuccess(
  params: Record<string, string | string[] | undefined>,
): boolean {
  const orderIds = params.orderIds;
  return typeof orderIds === 'string' && orderIds.trim().length > 0;
}

/** Merge portal error redirect: preserve params and set cancelled=1. */
export function buildCheckoutReturnCancelledQuery(
  params: Record<string, string | string[] | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'cancelled') continue;
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== undefined) qs.append(key, v);
      }
    } else if (value !== '') {
      qs.set(key, value);
    }
  }
  qs.set('cancelled', '1');
  const s = qs.toString();
  return s ? `?${s}` : '?cancelled=1';
}
