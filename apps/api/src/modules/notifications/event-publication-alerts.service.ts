import { Injectable, Logger } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { SmartAlertsPreparedService } from './smart-alerts-prepared.service';

/**
 * Dispara alertas inteligentes cuando un evento pasa a APPROVED (publicación).
 * No re-dispara si ya estaba APPROVED (ediciones menores).
 */
@Injectable()
export class EventPublicationAlertsService {
  private readonly logger = new Logger(EventPublicationAlertsService.name);

  constructor(private readonly smartAlerts: SmartAlertsPreparedService) {}

  handleEventBecameApproved(
    tenantId: string,
    eventId: string,
    previousStatus?: EventStatus,
  ): void {
    if (previousStatus === 'APPROVED') return;

    void this.smartAlerts
      .dispatchPublicationAlerts(tenantId, eventId)
      .then((summary) => {
        if (summary.skipped) {
          this.logger.debug(`Publication alerts skipped event=${eventId} reason=${summary.skipped}`);
          return;
        }
        const total =
          summary.producer.delivered + summary.interest.delivered;
        if (total > 0) {
          this.logger.log(
            `Publication alerts event=${eventId} producer=${summary.producer.delivered} interest=${summary.interest.delivered} throttled=${summary.interest.throttled}`,
          );
        }
      })
      .catch((err) => {
        this.logger.error(`Publication alerts failed event=${eventId}`, err);
      });
  }
}
