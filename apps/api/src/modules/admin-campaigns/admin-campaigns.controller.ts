import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  Role,
  adminCampaignContentPickerQuerySchema,
  adminCampaignDeliveriesQuerySchema,
  adminCampaignsListQuerySchema,
  createAdminCampaignBodySchema,
  updateAdminCampaignBodySchema,
  type AdminCampaignContentPickerQuery,
  type AdminCampaignDeliveriesQuery,
  type AdminCampaignsListQuery,
  type CreateAdminCampaignBody,
  type UpdateAdminCampaignBody,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminCampaignsService } from './admin-campaigns.service';

@Controller('admin/campaigns')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminCampaignsController {
  constructor(private readonly campaigns: AdminCampaignsService) {}

  @Get()
  list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminCampaignsListQuerySchema)) query: AdminCampaignsListQuery,
  ) {
    return this.campaigns.list(user.tenantId, query);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(createAdminCampaignBodySchema)) body: CreateAdminCampaignBody,
  ) {
    return this.campaigns.create(user.tenantId, user, body);
  }

  @Get('content-picker')
  contentPicker(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminCampaignContentPickerQuerySchema))
    query: AdminCampaignContentPickerQuery,
  ) {
    return this.campaigns.listContentPicker(user.tenantId, query.contentType, query.q);
  }

  @Get(':id/preview')
  preview(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.campaigns.preview(user.tenantId, id);
  }

  @Get(':id/deliveries')
  deliveries(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Query(new ZodValidationPipe(adminCampaignDeliveriesQuerySchema))
    query: AdminCampaignDeliveriesQuery,
  ) {
    return this.campaigns.listDeliveries(user.tenantId, id, query);
  }

  @Get(':id')
  get(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.campaigns.get(user.tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAdminCampaignBodySchema)) body: UpdateAdminCampaignBody,
  ) {
    return this.campaigns.update(user.tenantId, user, id, body);
  }

  @Post(':id/send')
  send(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
  ) {
    return this.campaigns.send(user.tenantId, user, id);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
  ) {
    return this.campaigns.cancel(user.tenantId, user, id);
  }

  @Post(':id/archive')
  archive(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('id') id: string,
  ) {
    return this.campaigns.archive(user.tenantId, user, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.campaigns.removeDraft(user.tenantId, id);
  }
}
