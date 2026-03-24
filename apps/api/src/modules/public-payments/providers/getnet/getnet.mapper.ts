/**
 * Maps Getnet remote status to local PaymentStatus.
 * / Mapea estado remoto de Getnet a PaymentStatus local.
 */

import type { PaymentStatus } from '@prisma/client';
import type { GetnetRemoteStatus } from './getnet-checkout.service';

/** Maps Getnet/remote status to Prisma PaymentStatus */
export function mapGetnetStatusToLocal(remote: GetnetRemoteStatus): PaymentStatus {
  switch (remote?.toUpperCase?.()) {
    case 'SUCCESS':
    case 'APPROVED':
      return 'APPROVED';
    case 'PENDING':
      return 'PENDING';
    case 'FAILED':
    case 'REJECTED':
      return 'REJECTED';
    case 'EXPIRED':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}
