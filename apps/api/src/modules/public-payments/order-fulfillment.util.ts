/**
 * Pure helpers for order fulfillment (unit-testable without DB).
 */

export function expectedTicketCountFromItems(
  items: Array<{ quantity: number }>,
): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** True when the order already has all tickets that should be issued. */
export function isOrderTicketFulfillmentComplete(
  existingTicketCount: number,
  expectedTicketCount: number,
): boolean {
  return existingTicketCount >= expectedTicketCount;
}

export function paymentMetadataHasConfirmationEmailSent(
  metadata: unknown,
): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }
  return (metadata as { orderConfirmationEmailSent?: boolean })
    .orderConfirmationEmailSent === true;
}
