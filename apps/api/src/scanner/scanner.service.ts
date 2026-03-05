import { Injectable } from '@nestjs/common';
import { ScanRequest, ScanResponse, ScanResult } from '@yo-te-invito/shared';

/**
 * Scanner service — mocked validation for V1 bootstrap
 * Service de escáner — validación simulada para bootstrap V1
 * TODO: Replace with atomic DB transaction + TicketScanLog when schema is ready
 */
@Injectable()
export class ScannerService {
  async scan(request: ScanRequest): Promise<ScanResponse> {
    // Stub: always return OK for any qrCode in bootstrap
    // Stub: siempre retorna OK para cualquier qrCode en bootstrap
    return {
      result: ScanResult.OK,
      ticketId: `tkt-${request.qrCode.slice(0, 8)}`,
      eventId: 'evt-stub-1',
      ticketTypeName: 'General',
      message: 'Valid ticket (stub)',
    };
  }
}
