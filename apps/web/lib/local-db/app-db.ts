/**
 * App LocalDB factory — same config as LocalRepository.
 * Use for seed, export, and any dev tools that need the app storage.
 */

import { LocalDB } from './LocalDB';

export const APP_DB_INDEXES: Record<string, string[]> = {
  events: ['tenantId'],
  tickets: ['eventId', 'ownerUserId'],
  orders: ['tenantId', 'eventId', 'buyerUserId'],
  users: ['tenantId'],
  reviews: ['eventId'],
  referralLinks: ['eventId'],
  courtesyGrants: ['eventId'],
  ticketTypes: ['eventId'],
  ticketScanLogs: ['eventId'],
  payoutRequests: ['tenantId', 'eventId', 'producerId'],
  resaleListings: ['eventId', 'sellerUserId', 'status'],
  referralCommissions: ['referrerId', 'eventId', 'status'],
  gastroContent: ['eventId'],
  gastroDiscounts: ['eventId', 'status'],
  gastroDiscountValidations: ['discountId'],
  userPreferences: ['userId'],
};

/** Creates LocalDB with app indexes. Same storage keys as LocalRepository. */
export function createAppLocalDB(storage?: Storage): LocalDB {
  return new LocalDB(
    { indexes: APP_DB_INDEXES },
    storage ?? (typeof window !== 'undefined' ? localStorage : (null as unknown as Storage))
  );
}
