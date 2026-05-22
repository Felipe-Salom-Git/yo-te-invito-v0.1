import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  Role,
  rejectReferralPaymentRequestSchema,
  type RejectReferralPaymentRequestInput,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ReferralPaymentRequestsService } from '../referrals/referral-payment-requests.service';

@Controller('producer/referrals/payment-requests')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerReferralPaymentRequestsController {
  constructor(
    private readonly paymentRequests: ReferralPaymentRequestsService,
    private readonly profilesAuth: ProfilesAuthorizationService,
  ) {}

  private async producerProfileId(tenantId: string, userId: string): Promise<string> {
    const profileId = await this.profilesAuth.getDefaultProducerProfileId(tenantId, userId);
    if (!profileId) throw new NotFoundException('No active producer profile found');
    return profileId;
  }

  @Get()
  async list(@CurrentUser() user: { id: string; tenantId: string }) {
    const producerProfileId = await this.producerProfileId(user.tenantId, user.id);
    return this.paymentRequests.listForProducer(user.tenantId, producerProfileId);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    const producerProfileId = await this.producerProfileId(user.tenantId, user.id);
    return this.paymentRequests.getForProducer(user.tenantId, producerProfileId, id);
  }

  @Post(':id/mark-in-review')
  async markInReview(
    @CurrentUser() user: { id: string; tenantId: string; role?: string },
    @Param('id') id: string,
  ) {
    const producerProfileId = await this.producerProfileId(user.tenantId, user.id);
    return this.paymentRequests.markInReviewForProducer(
      user.tenantId,
      producerProfileId,
      id,
      user.id,
      user.role ?? Role.PRODUCER_OWNER,
    );
  }

  @Post(':id/mark-paid')
  async markPaid(
    @CurrentUser() user: { id: string; tenantId: string; role?: string },
    @Param('id') id: string,
  ) {
    const producerProfileId = await this.producerProfileId(user.tenantId, user.id);
    return this.paymentRequests.markPaidForProducer(
      user.tenantId,
      producerProfileId,
      id,
      user.id,
      user.role ?? Role.PRODUCER_OWNER,
    );
  }

  @Post(':id/reject')
  async reject(
    @CurrentUser() user: { id: string; tenantId: string; role?: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectReferralPaymentRequestSchema))
    body: RejectReferralPaymentRequestInput,
  ) {
    const producerProfileId = await this.producerProfileId(user.tenantId, user.id);
    return this.paymentRequests.rejectForProducer(
      user.tenantId,
      producerProfileId,
      id,
      user.id,
      user.role ?? Role.PRODUCER_OWNER,
      body,
    );
  }
}
