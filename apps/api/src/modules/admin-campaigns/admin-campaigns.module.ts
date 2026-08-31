import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminCampaignsController } from './admin-campaigns.controller';
import { AdminCampaignsService } from './admin-campaigns.service';
import { CampaignAudienceService } from './campaign-audience.service';
import { CampaignContentService } from './campaign-content.service';
import { CampaignEmailQueueService } from './campaign-email-queue.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminCampaignsController],
  providers: [
    RolesGuard,
    AdminCampaignsService,
    CampaignAudienceService,
    CampaignContentService,
    CampaignEmailQueueService,
  ],
  exports: [
    AdminCampaignsService,
    CampaignAudienceService,
    CampaignContentService,
    CampaignEmailQueueService,
  ],
})
export class AdminCampaignsModule {}
