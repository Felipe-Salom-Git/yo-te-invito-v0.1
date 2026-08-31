import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  isManualShortCodeInput,
  normalizeManualShortCode,
  resolveTicketQrPayloadByShortCode,
} from '@yo-te-invito/shared';
import { allocateGastroClaimShortCode } from '../common/gastro-claim-short-code.util';

@Injectable()
export class ScannerShortCodeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveTicketQrPayload(
    tenantId: string,
    eventId: string,
    rawPayload: string,
  ): Promise<string> {
    const trimmed = rawPayload.trim();
    if (!isManualShortCodeInput(trimmed)) return trimmed;

    const code = normalizeManualShortCode(trimmed);
    const tickets = await this.prisma.ticket.findMany({
      where: { eventId, event: { tenantId } },
      select: { id: true, qrPayload: true },
    });
    return resolveTicketQrPayloadByShortCode(code, tickets) ?? trimmed;
  }

  allocateGastroClaimShortCode(): Promise<string> {
    return allocateGastroClaimShortCode(this.prisma);
  }
}
