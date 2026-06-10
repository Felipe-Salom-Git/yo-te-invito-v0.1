/** Last 8 alphanumeric chars of ticket id — safe for control lists (no full QR). */
export function shortTicketCode(ticketId: string): string {
  const tail = ticketId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return tail || ticketId.slice(0, 8).toUpperCase();
}

/** Last 6 chars of QR payload for partial identification in PDFs. */
export function partialQrSuffix(qrPayload: string): string {
  const clean = qrPayload.replace(/\s/g, '');
  if (clean.length <= 6) return clean;
  return `…${clean.slice(-6)}`;
}
