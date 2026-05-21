import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TicketTransferOfferService } from './ticket-transfer-offer.service';

@Injectable()
export class TicketTransferSchedulerService {
  private readonly logger = new Logger(TicketTransferSchedulerService.name);

  constructor(private readonly transfers: TicketTransferOfferService) {}

  @Cron(process.env.NODE_ENV === 'development' ? '*/10 * * * *' : '*/15 * * * *')
  async expireStaleTransferOffers() {
    if (process.env.TICKET_TRANSFER_CRON_ENABLED === 'false') {
      return;
    }
    try {
      const count = await this.transfers.expireDueOffers();
      if (count > 0) {
        this.logger.log(`Expired ${count} ticket transfer offer(s)`);
      }
    } catch (err) {
      this.logger.error('Ticket transfer expiry cron failed', err);
    }
  }
}
