import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { InboxModule } from '../inbox/inbox.module';
import { PublicModule } from '../../public/public.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LegalModule } from '../legal/legal.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ReferrerRolesGuard } from '../../common/guards/referrer-roles.guard';
import { MeController } from './me.controller';
import { MePortalController } from './me-portal.controller';
import { MeCartController } from './me-cart.controller';
import { MeFavoritesController } from './me-favorites.controller';
import { MeExpectedEventsController } from './me-expected-events.controller';
import { MeTicketTransferController } from './me-ticket-transfer.controller';
import { MeNotificationsController } from './me-notifications.controller';
import { MeProducerFollowsController } from './me-producer-follows.controller';
import { MeGastroFollowsController } from './me-gastro-follows.controller';
import { MePushSubscriptionsController } from './me-push-subscriptions.controller';
import { MeRecommendationsController } from './me-recommendations.controller';
import { MeLegalController } from './me-legal.controller';
import { MeService } from './me.service';
import { MeDashboardService } from './me-dashboard.service';
import { MeActivityService } from './me-activity.service';
import { MeAccountService } from './me-account.service';
import { UserCartService } from './user-cart.service';
import { UserFavoritesService } from './user-favorites.service';
import { UserExpectedEventsService } from './user-expected-events.service';
import { TicketTransferOfferService } from './ticket-transfer-offer.service';
import { TicketTransferSchedulerService } from './ticket-transfer-scheduler.service';
import { UserProducerFollowsService } from './user-producer-follows.service';
import { UserGastroFollowsService } from './user-gastro-follows.service';
import { UserPushSubscriptionsService } from './user-push-subscriptions.service';
import { MeRecommendationsService } from './me-recommendations.service';

@Module({
  imports: [AuthModule, ReferralsModule, InboxModule, PublicModule, NotificationsModule, LegalModule],
  controllers: [
    MeController,
    MePortalController,
    MeLegalController,
    MeCartController,
    MeFavoritesController,
    MeExpectedEventsController,
    MeTicketTransferController,
    MeNotificationsController,
    MeProducerFollowsController,
    MeGastroFollowsController,
    MePushSubscriptionsController,
    MeRecommendationsController,
  ],
  providers: [
    ProfilesAuthorizationService,
    ReferrerRolesGuard,
    MeService,
    MeDashboardService,
    MeActivityService,
    MeAccountService,
    UserCartService,
    UserFavoritesService,
    UserExpectedEventsService,
    TicketTransferOfferService,
    TicketTransferSchedulerService,
    UserProducerFollowsService,
    UserGastroFollowsService,
    UserPushSubscriptionsService,
    MeRecommendationsService,
  ],
})
export class MeModule {}
