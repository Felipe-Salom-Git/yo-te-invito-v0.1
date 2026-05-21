/** Public web URL for a buyer to accept a transfer (share with recipient). */
export function buildTransferAcceptUrl(acceptToken: string): string {
  const path = `/me/ticket-transfer/${encodeURIComponent(acceptToken)}`;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}
