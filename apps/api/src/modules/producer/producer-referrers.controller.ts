import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ReferralsService } from '../referrals/referrals.service';
import { CommercialReviewsService } from '../commercial-reviews/commercial-reviews.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  updateAssociationStatusSchema,
  assignReferrerToEventSchema,
  producerAssociationFromLinkSchema,
  producerFreelanceAssociationRequestSchema,
  producerFreelanceReferrersQuerySchema,
  commercialRelationshipReviewSubmitSchema,
  type CommercialRelationshipReviewSubmitInput,
  type UpdateAssociationStatusInput,
  type AssignReferrerToEventInput,
  type ProducerAssociationFromLinkInput,
  type ProducerFreelanceAssociationRequestInput,
  type ProducerFreelanceReferrersQuery,
} from '@yo-te-invito/shared';

@Controller('producer/referrers')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerReferrersController {
  constructor(
    private readonly referrals: ReferralsService,
    private readonly commercialReviews: CommercialReviewsService,
    private readonly profilesAuth: ProfilesAuthorizationService,
  ) {}

  @Get(':referrerProfileId/commercial-reviews')
  async listCommercialReviews(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('referrerProfileId') referrerProfileId: string,
  ) {
    const profileId = await this.profilesAuth.getDefaultProducerProfileId(user.tenantId, user.id);
    if (!profileId) throw new NotFoundException('No active producer profile found');
    return this.commercialReviews.listForProducerReferrer(
      user.tenantId,
      user.id,
      profileId,
      referrerProfileId,
    );
  }

  @Post(':referrerProfileId/commercial-reviews')
  async createCommercialReview(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('referrerProfileId') referrerProfileId: string,
    @Body(new ZodValidationPipe(commercialRelationshipReviewSubmitSchema))
    body: CommercialRelationshipReviewSubmitInput,
  ) {
    const profileId = await this.profilesAuth.getDefaultProducerProfileId(user.tenantId, user.id);
    if (!profileId) throw new NotFoundException('No active producer profile found');
    return this.commercialReviews.createAsProducer(user.tenantId, user.id, {
      ...body,
      producerProfileId: profileId,
      referrerProfileId,
      targetType: 'REFERRER',
    });
  }

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
  async getFreelanceReferrers(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query(new ZodValidationPipe(producerFreelanceReferrersQuerySchema)) query: ProducerFreelanceReferrersQuery,
  ) {
    const producerProfileId = await this.profilesAuth.getDefaultProducerProfileId(user.tenantId, user.id);
    return this.referrals.getFreelanceReferrers(user.tenantId, producerProfileId ?? null, query);
  }

  /** Lets the frontend branch when the user has no producer profile (e.g. join-link flow). */
  @Get('context')
  async producerReferrerContext(@CurrentUser() user: { id: string; tenantId: string }) {
    const producerProfileId = await this.profilesAuth.getDefaultProducerProfileId(
      user.tenantId,
      user.id,
    );
    return {
      hasProducerProfile: !!producerProfileId,
      producerProfileId,
    };
  }

  @Post('freelance/request')
  async requestFreelanceAssociation(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(producerFreelanceAssociationRequestSchema))
    body: ProducerFreelanceAssociationRequestInput,
  ) {
    const profileId = await this.profilesAuth.getDefaultProducerProfileId(user.tenantId, user.id);
    if (!profileId) {
      throw new BadRequestException({
        code: 'PRODUCER_PROFILE_REQUIRED',
        message: 'Se requiere un perfil de productor activo para solicitar asociación',
      });
    }
    return this.referrals.requestAssociationFromFreelanceList(
      user.tenantId,
      profileId,
      body.referrerProfileId,
    );
  }

  @Post('association-from-link')
  async associationFromLink(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(producerAssociationFromLinkSchema)) body: ProducerAssociationFromLinkInput,
  ) {
    const profileId = await this.profilesAuth.getDefaultProducerProfileId(user.tenantId, user.id);
    if (!profileId) {
      throw new BadRequestException({
        code: 'PRODUCER_PROFILE_REQUIRED',
        message: 'Se requiere un perfil de productor activo para asociarte desde este link',
      });
    }
    return this.referrals.associateProducerViaReferrerLink(
      user.tenantId,
      profileId,
      body.token,
    );
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

  /** Listado formal de asignaciones evento ↔ referidor (capa distinta de la relación general). */
  @Get('events/:eventId/assignments')
  async listEventAssignments(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('eventId') eventId: string,
  ) {
    const profileId = await this.profilesAuth.getDefaultProducerProfileId(user.tenantId, user.id);
    if (!profileId) throw new NotFoundException('No active producer profile found');
    return this.referrals.listEventAssignmentsForProducer(user.tenantId, eventId, profileId);
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

