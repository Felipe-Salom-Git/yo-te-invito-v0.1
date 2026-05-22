import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  Role,
  createReferralCommercialProposalSchema,
  type CreateReferralCommercialProposalInput,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ReferralProposalsService } from '../referrals/referral-proposals.service';

@Controller('producer/referrals/proposals')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerReferralProposalsController {
  constructor(
    private readonly proposals: ReferralProposalsService,
    private readonly profilesAuth: ProfilesAuthorizationService,
  ) {}

  private async producerProfileId(tenantId: string, userId: string): Promise<string> {
    const profileId = await this.profilesAuth.getDefaultProducerProfileId(tenantId, userId);
    if (!profileId) throw new NotFoundException('No active producer profile found');
    return profileId;
  }

  @Post()
  async create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(createReferralCommercialProposalSchema))
    body: CreateReferralCommercialProposalInput,
  ) {
    const producerProfileId = await this.producerProfileId(user.tenantId, user.id);
    return this.proposals.createForProducer(user.tenantId, producerProfileId, body);
  }

  @Get()
  async list(@CurrentUser() user: { id: string; tenantId: string }) {
    const producerProfileId = await this.producerProfileId(user.tenantId, user.id);
    return this.proposals.listForProducer(user.tenantId, producerProfileId);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    const producerProfileId = await this.producerProfileId(user.tenantId, user.id);
    return this.proposals.getForProducer(user.tenantId, producerProfileId, id);
  }

  @Post(':id/cancel')
  async cancel(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    const producerProfileId = await this.producerProfileId(user.tenantId, user.id);
    return this.proposals.cancelForProducer(user.tenantId, producerProfileId, id);
  }
}
