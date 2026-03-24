import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ProducerEventsController } from './producer-events.controller';
import { ProducerReferrersController } from './producer-referrers.controller';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { ProducerTicketTypesController } from './producer-ticket-types.controller';
import { EventMetricsService } from './event-metrics.service';
import { ProducerEventsCrudService } from './producer-events-crud.service';
import { ProducerTicketTypesService } from './producer-ticket-types.service';
import { ProducerProfileController } from './producer-profile.controller';
import { ProducerProfileService } from './producer-profile.service';

@Module({
  imports: [AuthModule, ReferralsModule],
  controllers: [
    ProducerEventsController,
    ProducerReferrersController,
    ProducerTicketTypesController,
    ProducerProfileController,
  ],
  providers: [
    ProfilesAuthorizationService,
    ProducerRolesGuard,
    EventMetricsService,
    ProducerEventsCrudService,
    ProducerTicketTypesService,
    ProducerProfileService,
  ],
})
export class ProducerModule { }
