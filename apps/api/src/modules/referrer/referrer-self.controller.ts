import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ReferrerRolesGuard } from '../../common/guards/referrer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import {
  referrerProfilePatchSchema,
  referrerRespondProducerAssociationSchema,
  type ReferrerProfilePatchInput,
  type ReferrerRespondProducerAssociationInput,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ReferrerProfilesService } from './referrer-profiles.service';
import { ReferralsService } from '../referrals/referrals.service';

@Controller('referrer')
@UseGuards(JwtOrDevAuthGuard, ReferrerRolesGuard)
@RequireRole(Role.ADMIN, Role.REFERRER)
export class ReferrerSelfController {
  constructor(
    private readonly referrers: ReferrerProfilesService,
    private readonly referrals: ReferralsService,
  ) {}

  @Get('me')
  async getMe(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.referrers.getMyProfile(user.tenantId, user.id);
  }

  @Patch('me')
  async patchMe(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(referrerProfilePatchSchema)) body: ReferrerProfilePatchInput,
  ) {
    return this.referrers.updateMyProfile(user.tenantId, user.id, body);
  }

  @Get('me/dashboard')
  async dashboard(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.referrers.getDashboardSummary(user.tenantId, user.id);
  }

  /** Relaciones generales productora ↔ referidor (no confundir con asignación a evento). */
  @Get('me/producer-relationships')
  async listProducerRelationships(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.referrals.listProducerRelationshipsForReferrerUser(user.tenantId, user.id);
  }

  @Post('me/producer-relationships/:producerProfileId/respond')
  async respondToProducerAssociation(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('producerProfileId') producerProfileId: string,
    @Body(new ZodValidationPipe(referrerRespondProducerAssociationSchema))
    body: ReferrerRespondProducerAssociationInput,
  ) {
    return this.referrals.transitionAssociationAsReferrer(
      user.tenantId,
      user.id,
      producerProfileId,
      body.status,
      body.notes,
    );
  }
}
