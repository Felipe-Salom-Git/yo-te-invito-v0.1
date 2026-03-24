import { Body, Controller, Get, Param, Post, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ReferralsService } from '../referrals/referrals.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  updateAssociationStatusSchema,
  assignReferrerToEventSchema,
  type UpdateAssociationStatusInput,
  type AssignReferrerToEventInput,
} from '@yo-te-invito/shared';

@Controller('producer/referrers')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerReferrersController {
  constructor(
    private readonly referrals: ReferralsService,
    private readonly profilesAuth: ProfilesAuthorizationService,
  ) { }

  @Get()
  async listReferrers(@CurrentUser() user: { tenantId: string }) {
    // Legacy generic list
    return this.referrals.listReferrers(user.tenantId);
  }

  @Get('associated')
  async getAssociatedReferrers(@CurrentUser() user: { id: string; tenantId: string }) {
    const profileId = await this.profilesAuth.getDefaultProducerProfileId(user.tenantId, user.id);
    if (!profileId) throw new NotFoundException('No active producer profile found');
    return this.referrals.getAssociatedReferrers(user.tenantId, profileId);
  }

  @Get('freelance')
  async getFreelanceReferrers(@CurrentUser() user: { tenantId: string }) {
    return this.referrals.getFreelanceReferrers(user.tenantId);
  }

  @Post(':referrerProfileId/association')
  async setAssociationStatus(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('referrerProfileId') referrerProfileId: string,
    @Body(new ZodValidationPipe(updateAssociationStatusSchema)) body: UpdateAssociationStatusInput,
  ) {
    const profileId = await this.profilesAuth.getDefaultProducerProfileId(user.tenantId, user.id);
    if (!profileId) throw new NotFoundException('No active producer profile found');
    return this.referrals.setAssociationStatus(profileId, referrerProfileId, body.status, body.notes);
  }

  @Post('events/:eventId/assign')
  async assignReferrerToEvent(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(assignReferrerToEventSchema)) body: AssignReferrerToEventInput,
  ) {
    const profileId = await this.profilesAuth.getDefaultProducerProfileId(user.tenantId, user.id);
    if (!profileId) throw new NotFoundException('No active producer profile found');
    return this.referrals.createEventAssignment(
      user.tenantId,
      eventId,
      profileId,
      body.referrerProfileId,
      body.courtesyQuota,
    );
  }
}

