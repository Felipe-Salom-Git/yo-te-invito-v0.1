import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { ProducerEventsController } from './producer-events.controller';
import { ProducerReferrersController } from './producer-referrers.controller';
import { ProducerTicketTypesController } from './producer-ticket-types.controller';
import { EventMetricsService } from './event-metrics.service';
import { ProducerEventsCrudService } from './producer-events-crud.service';
import { ProducerTicketTypesService } from './producer-ticket-types.service';

@Module({
  imports: [AuthModule, ReferralsModule],
  controllers: [
    ProducerEventsController,
    ProducerReferrersController,
    ProducerTicketTypesController,
  ],
  providers: [
    EventMetricsService,
    ProducerEventsCrudService,
    ProducerTicketTypesService,
  ],
})
export class ProducerModule {}
