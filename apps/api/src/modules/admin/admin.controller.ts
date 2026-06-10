import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  auditLogsListQuerySchema,
  revokeTicketParamsSchema,
  revokeTicketBodySchema,
  fraudSignalsParamsSchema,
  fraudSignalsQuerySchema,
  adminUsersListQuerySchema,
  adminCreateReferrerBodySchema,
  adminUpdateRoleBodySchema,
  adminConfigPatchSchema,
  adminInboxListQuerySchema,
  adminResolveInboxBodySchema,
  type AuditLogsListQuery,
  type RevokeTicketParams,
  type RevokeTicketBody,
  type FraudSignalsParams,
  type FraudSignalsQuery,
  type AdminUsersListQuery,
  type AdminCreateReferrerBody,
  type AdminUpdateRoleBody,
  type AdminConfigPatch,
  type AdminInboxListQuery,
  type AdminResolveInboxBody,
  adminProducersListQuerySchema,
  adminProducerIdParamsSchema,
  adminProducerEventIdParamsSchema,
  eventModerationReasonSchema,
  type AdminProducersListQuery,
  type AdminProducerIdParams,
  type AdminProducerEventIdParams,
  type EventModerationReason,
  generalPublicationsListQuerySchema,
  createGeneralPublicationBodySchema,
  type GeneralPublicationsListQuery,
  type CreateGeneralPublicationBody,
  adminGastroLocationsListQuerySchema,
  adminGastroPendingDiscountsQuerySchema,
  adminGastroProfileIdParamsSchema,
  adminGastroDiscountIdParamsSchema,
  adminGastroDiscountPublicationSchema,
  adminGastroDiscountActionNoteSchema,
  adminGastroDiscountRejectSchema,
  adminGastroDiscountCancelSchema,
  type AdminGastroLocationsListQuery,
  type AdminGastroPendingDiscountsQuery,
  type AdminGastroProfileIdParams,
  ErrorCode,
  type AdminGastroDiscountIdParams,
  type AdminGastroDiscountPublication,
  type AdminGastroDiscountActionNote,
  type AdminGastroDiscountReject,
  type AdminGastroDiscountCancel,
  adminGastroLocationCreateSchema,
  adminGastroLocationUpdateSchema,
  adminGastroLocationStatusPatchSchema,
  type AdminGastroLocationCreateInput,
  type AdminGastroLocationUpdateInput,
  type AdminGastroLocationStatusPatchInput,
  adminEventsListQuerySchema,
  type AdminEventsListQuery,
  adminContentLifecycleBodySchema,
  adminEventIdParamsSchema,
  rentalLocationIdParamsSchema,
  excursionOperatorIdParamsSchema,
  type AdminContentLifecycleBody,
  type AdminEventIdParams,
  type RentalLocationIdParams,
  type ExcursionOperatorIdParams,
  adminHotelProfilesListQuerySchema,
  adminHotelProfileIdParamsSchema,
  type AdminHotelProfilesListQuery,
  type AdminHotelProfileIdParams,
} from '@yo-te-invito/shared';
import { AdminGastroService } from './admin-gastro.service';
import { AdminGastroLocationsService } from './admin-gastro-locations.service';
import { AdminProducersService } from './admin-producers.service';
import { AdminGeneralPublicationsService } from './admin-general-publications.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { AdminEventsService } from './admin-events.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminTicketsService } from './admin-tickets.service';
import { AdminFraudService } from './admin-fraud.service';
import { PlatformMetricsService } from './platform-metrics.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminUsersService } from './admin-users.service';
import { AdminConfigService } from './admin-config.service';
import { AdminApplicationsService } from './admin-applications.service';
import { AdminProfilesService } from './admin-profiles.service';
import { ReferralsService } from '../referrals/referrals.service';
import { InboxService } from '../inbox/inbox.service';
import { AdminContentLifecycleService } from './admin-content-lifecycle.service';
import { AdminHotelProfilesService } from './admin-hotel-profiles.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly events: AdminEventsService,
    private readonly contentLifecycle: AdminContentLifecycleService,
    private readonly audit: AdminAuditService,
    private readonly tickets: AdminTicketsService,
    private readonly fraud: AdminFraudService,
    private readonly platformMetrics: PlatformMetricsService,
    private readonly adminDashboard: AdminDashboardService,
    private readonly users: AdminUsersService,
    private readonly config: AdminConfigService,
    private readonly applications: AdminApplicationsService,
    private readonly profiles: AdminProfilesService,
    private readonly referrals: ReferralsService,
    private readonly inbox: InboxService,
    private readonly adminProducers: AdminProducersService,
    private readonly generalPublications: AdminGeneralPublicationsService,
    private readonly adminGastro: AdminGastroService,
    private readonly adminGastroLocations: AdminGastroLocationsService,
    private readonly adminHotelProfiles: AdminHotelProfilesService,
  ) {}

  @Get('general-publications')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listGeneralPublications(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(generalPublicationsListQuerySchema))
    query: GeneralPublicationsListQuery,
  ) {
    return this.generalPublications.list(user.tenantId, query);
  }

  @Post('general-publications')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async createGeneralPublication(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(createGeneralPublicationBodySchema))
    body: CreateGeneralPublicationBody,
  ) {
    return this.generalPublications.create(user.tenantId, user.id, body);
  }

  @Get('producers')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listProducers(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminProducersListQuerySchema))
    query: AdminProducersListQuery,
  ) {
    return this.adminProducers.list(user.tenantId, query);
  }

  @Get('producers/:producerId')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async getProducer(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(adminProducerIdParamsSchema))
    params: AdminProducerIdParams,
  ) {
    return this.adminProducers.getDetail(user.tenantId, params.producerId);
  }

  @Get('producers/:producerId/events')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listProducerEvents(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(adminProducerIdParamsSchema))
    params: AdminProducerIdParams,
  ) {
    return this.adminProducers.listEvents(user.tenantId, params.producerId);
  }

  @Get('producers/:producerId/events/:eventId/metrics')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async getProducerEventMetrics(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(adminProducerEventIdParamsSchema))
    params: AdminProducerEventIdParams,
  ) {
    return this.adminProducers.getEventMetrics(
      user.tenantId,
      params.producerId,
      params.eventId,
    );
  }

  @Post('producers/:producerId/events/:eventId/approve')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async approveProducerEvent(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminProducerEventIdParamsSchema))
    params: AdminProducerEventIdParams,
  ) {
    return this.adminProducers.approveProducerEvent(
      user.tenantId,
      user.id,
      user.role,
      params.producerId,
      params.eventId,
    );
  }

  @Post('producers/:producerId/events/:eventId/reject')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async rejectProducerEvent(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminProducerEventIdParamsSchema))
    params: AdminProducerEventIdParams,
    @Body(new ZodValidationPipe(eventModerationReasonSchema))
    body: EventModerationReason,
  ) {
    return this.adminProducers.rejectProducerEvent(
      user.tenantId,
      user.id,
      user.role,
      params.producerId,
      params.eventId,
      body.reason,
    );
  }

  @Post('producers/:producerId/events/:eventId/postpone')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async postponeProducerEvent(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminProducerEventIdParamsSchema))
    params: AdminProducerEventIdParams,
    @Body(new ZodValidationPipe(eventModerationReasonSchema))
    body: EventModerationReason,
  ) {
    return this.adminProducers.postponeProducerEvent(
      user.tenantId,
      user.id,
      user.role,
      params.producerId,
      params.eventId,
      body.reason,
      body.newStartAt,
    );
  }

  @Post('producers/:producerId/events/:eventId/cancel')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async cancelProducerEvent(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminProducerEventIdParamsSchema))
    params: AdminProducerEventIdParams,
    @Body(new ZodValidationPipe(eventModerationReasonSchema))
    body: EventModerationReason,
  ) {
    return this.adminProducers.cancelProducerEvent(
      user.tenantId,
      user.id,
      user.role,
      params.producerId,
      params.eventId,
      body.reason,
    );
  }

  @Get('events')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listEvents(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminEventsListQuerySchema))
    query: AdminEventsListQuery,
  ) {
    return this.events.listForAdmin(user.tenantId, query);
  }

  @Post('events/:eventId/approve')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async approveEvent(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
  ) {
    return this.events.approveEvent(
      user.tenantId,
      user.id,
      user.role,
      eventId,
    );
  }

  @Post('events/:eventId/pause')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async pauseEvent(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminEventIdParamsSchema)) params: AdminEventIdParams,
    @Body(new ZodValidationPipe(adminContentLifecycleBodySchema))
    body: AdminContentLifecycleBody,
  ) {
    return this.contentLifecycle.pauseEvent(
      user.tenantId,
      user.id,
      user.role,
      params.eventId,
      body.reason,
    );
  }

  @Post('events/:eventId/restore')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async restoreEvent(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminEventIdParamsSchema)) params: AdminEventIdParams,
    @Body(new ZodValidationPipe(adminContentLifecycleBodySchema))
    body: AdminContentLifecycleBody,
  ) {
    return this.contentLifecycle.restoreEvent(
      user.tenantId,
      user.id,
      user.role,
      params.eventId,
      body.reason,
    );
  }

  @Post('rental-locations/:id/deactivate')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async deactivateRentalLocation(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(rentalLocationIdParamsSchema)) params: RentalLocationIdParams,
    @Body(new ZodValidationPipe(adminContentLifecycleBodySchema))
    body: AdminContentLifecycleBody,
  ) {
    return this.contentLifecycle.deactivateRentalLocation(
      user.tenantId,
      user.id,
      user.role,
      params.id,
      body.reason,
    );
  }

  @Post('rental-locations/:id/activate')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async activateRentalLocation(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(rentalLocationIdParamsSchema)) params: RentalLocationIdParams,
    @Body(new ZodValidationPipe(adminContentLifecycleBodySchema))
    body: AdminContentLifecycleBody,
  ) {
    return this.contentLifecycle.activateRentalLocation(
      user.tenantId,
      user.id,
      user.role,
      params.id,
      body.reason,
    );
  }

  @Post('excursion-operators/:id/deactivate')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async deactivateExcursionOperator(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(excursionOperatorIdParamsSchema))
    params: ExcursionOperatorIdParams,
    @Body(new ZodValidationPipe(adminContentLifecycleBodySchema))
    body: AdminContentLifecycleBody,
  ) {
    return this.contentLifecycle.deactivateExcursionOperator(
      user.tenantId,
      user.id,
      user.role,
      params.id,
      body.reason,
    );
  }

  @Post('excursion-operators/:id/activate')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async activateExcursionOperator(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(excursionOperatorIdParamsSchema))
    params: ExcursionOperatorIdParams,
    @Body(new ZodValidationPipe(adminContentLifecycleBodySchema))
    body: AdminContentLifecycleBody,
  ) {
    return this.contentLifecycle.activateExcursionOperator(
      user.tenantId,
      user.id,
      user.role,
      params.id,
      body.reason,
    );
  }

  @Get('hotel-profiles')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listHotelProfiles(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminHotelProfilesListQuerySchema))
    query: AdminHotelProfilesListQuery,
  ) {
    return this.adminHotelProfiles.list(user.tenantId, query);
  }

  @Post('hotel-profiles/:id/suspend')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async suspendHotelProfile(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminHotelProfileIdParamsSchema)) params: AdminHotelProfileIdParams,
    @Body(new ZodValidationPipe(adminContentLifecycleBodySchema))
    body: AdminContentLifecycleBody,
  ) {
    return this.contentLifecycle.suspendHotelProfile(
      user.tenantId,
      user.id,
      user.role,
      params.id,
      body.reason,
    );
  }

  @Post('hotel-profiles/:id/activate')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async activateHotelProfile(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminHotelProfileIdParamsSchema)) params: AdminHotelProfileIdParams,
    @Body(new ZodValidationPipe(adminContentLifecycleBodySchema))
    body: AdminContentLifecycleBody,
  ) {
    return this.contentLifecycle.activateHotelProfile(
      user.tenantId,
      user.id,
      user.role,
      params.id,
      body.reason,
    );
  }

  @Post('tickets/:ticketId/revoke')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async revokeTicket(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(revokeTicketParamsSchema)) params: RevokeTicketParams,
    @Body(new ZodValidationPipe(revokeTicketBodySchema)) body: RevokeTicketBody,
  ) {
    return this.tickets.revoke(
      user.tenantId,
      user.id,
      user.role,
      params.ticketId,
      body,
    );
  }

  @Get('events/:eventId/fraud-signals')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listFraudSignals(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(fraudSignalsParamsSchema)) params: FraudSignalsParams,
    @Query(new ZodValidationPipe(fraudSignalsQuerySchema)) query: FraudSignalsQuery,
  ) {
    return this.fraud.listFraudSignals(user.tenantId, params.eventId, query);
  }

  @Get('platform/metrics')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async getPlatformMetrics() {
    return this.platformMetrics.getMetrics();
  }

  @Get('dashboard')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async getDashboard(@CurrentUser() user: { tenantId: string }) {
    return this.adminDashboard.getDashboard(user.tenantId);
  }

  @Get('audit-logs')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listAuditLogs(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(auditLogsListQuerySchema)) query: AuditLogsListQuery,
  ) {
    return this.audit.list({
      ...query,
      tenantId: user.tenantId,
    });
  }

  @Get('applications')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listApplications(@CurrentUser() user: { tenantId: string }) {
    return this.applications.listPending(user.tenantId);
  }

  @Post('applications/:id/approve')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async approveApplication(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') applicationId: string,
  ) {
    return this.applications.approve(user.tenantId, applicationId, user.id);
  }

  @Post('applications/:id/reject')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async rejectApplication(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') applicationId: string,
  ) {
    return this.applications.reject(user.tenantId, applicationId, user.id);
  }

  @Get('profiles/producer/pending')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listPendingProducerProfiles(@CurrentUser() user: { tenantId: string }) {
    return this.profiles.listPendingProducerProfiles(user.tenantId);
  }

  @Post('profiles/producer/:id/approve')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async approveProducerProfile(
    @CurrentUser() user: { tenantId: string },
    @Param('id') profileId: string,
  ) {
    return this.profiles.approveProducerProfile(user.tenantId, profileId);
  }

  @Get('profiles/gastro/pending')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listPendingGastroProfiles(@CurrentUser() user: { tenantId: string }) {
    return this.profiles.listPendingGastroProfiles(user.tenantId);
  }

  @Post('profiles/gastro/:id/approve')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async approveGastroProfile(
    @CurrentUser() user: { tenantId: string },
    @Param('id') profileId: string,
  ) {
    return this.profiles.approveGastroProfile(user.tenantId, profileId);
  }

  @Get('profiles/hotel/pending')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listPendingHotelProfiles(@CurrentUser() user: { tenantId: string }) {
    return this.profiles.listPendingHotelProfiles(user.tenantId);
  }

  @Post('profiles/hotel/:id/approve')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async approveHotelProfile(
    @CurrentUser() user: { tenantId: string },
    @Param('id') profileId: string,
  ) {
    return this.profiles.approveHotelProfile(user.tenantId, profileId);
  }

  @Get('profiles/referrer/pending')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listPendingReferrerProfiles(@CurrentUser() user: { tenantId: string }) {
    return this.profiles.listPendingReferrerProfiles(user.tenantId);
  }

  @Post('profiles/referrer/:id/approve')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async approveReferrerProfile(
    @CurrentUser() user: { tenantId: string },
    @Param('id') profileId: string,
  ) {
    return this.profiles.approveReferrerProfile(user.tenantId, profileId);
  }

  @Get('users')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listUsers(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminUsersListQuerySchema)) query: AdminUsersListQuery,
  ) {
    return this.users.list(user.tenantId, query);
  }

  @Post('users/referrer')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async createReferrer(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(adminCreateReferrerBodySchema)) body: AdminCreateReferrerBody,
  ) {
    return this.users.createReferrer(user.tenantId, body);
  }

  @Patch('users/:userId/role')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async updateUserRole(
    @CurrentUser() user: { tenantId: string },
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(adminUpdateRoleBodySchema)) body: AdminUpdateRoleBody,
  ) {
    return this.users.updateRole(user.tenantId, userId, body);
  }

  @Get('config')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async getConfig(@CurrentUser() user: { tenantId: string }) {
    return this.config.get(user.tenantId);
  }

  @Patch('config')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async updateConfig(
    @CurrentUser() user: { tenantId: string },
    @Body(new ZodValidationPipe(adminConfigPatchSchema)) body: AdminConfigPatch,
  ) {
    return this.config.update(user.tenantId, body);
  }

  @Get('inbox')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listInbox(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminInboxListQuerySchema)) query: AdminInboxListQuery,
  ) {
    return this.inbox.listForAdmin(user.tenantId, query);
  }

  @Post('inbox/:id/resolve')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async resolveInbox(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') inboxItemId: string,
    @Body(new ZodValidationPipe(adminResolveInboxBodySchema)) body: AdminResolveInboxBody,
  ) {
    return this.inbox.resolve(user.tenantId, user.id, inboxItemId, body);
  }

  @Get('gastronomicos/pending-discounts')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listPendingGastroDiscounts(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminGastroPendingDiscountsQuerySchema))
    query: AdminGastroPendingDiscountsQuery,
  ) {
    if (query.discountId) {
      const profileId =
        query.profileId ??
        (await this.adminGastro.resolveProfileIdForDiscount(
          user.tenantId,
          query.discountId,
        ));
      if (!profileId) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Discount not found',
        });
      }
      return this.adminGastro.getDiscountDetail(
        user.tenantId,
        profileId,
        query.discountId,
      );
    }
    if (query.profileId && query.includeAllStatuses) {
      return this.adminGastro.listLocationDiscounts(user.tenantId, query.profileId);
    }
    if (query.profileId) {
      const all = await this.adminGastro.listLocationDiscounts(
        user.tenantId,
        query.profileId,
      );
      const pendingStatuses = new Set([
        'PENDING_REVIEW',
        'COMMISSION_NEGOTIATION',
        'APPROVED',
      ]);
      return {
        data: all.data
          .filter((d) => pendingStatuses.has(d.status))
          .map((d) => ({
            ...d,
            profileId: query.profileId!,
            profileName: '',
          })),
      };
    }
    return this.adminGastro.listPendingDiscounts(user.tenantId);
  }

  /** Rutas planas (evitan conflicto de enrutado con /gastronomicos/:profileId/...) */
  @Get('gastro-discount-tickets')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listGastroDiscountTickets(
    @CurrentUser() user: { tenantId: string },
    @Query('profileId') profileId: string,
  ) {
    if (!profileId?.trim()) {
      throw new NotFoundException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'profileId query param is required',
      });
    }
    return this.adminGastro.listLocationDiscounts(user.tenantId, profileId.trim());
  }

  @Get('gastro-discount-tickets/:discountId')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async getGastroDiscountTicket(
    @CurrentUser() user: { tenantId: string },
    @Param('discountId') discountId: string,
    @Query('profileId') profileId?: string,
  ) {
    const resolvedProfileId =
      profileId?.trim() ??
      (await this.adminGastro.resolveProfileIdForDiscount(user.tenantId, discountId));
    if (!resolvedProfileId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    return this.adminGastro.getDiscountDetail(
      user.tenantId,
      resolvedProfileId,
      discountId,
    );
  }

  @Get('gastro-discount-tickets/:discountId/metrics')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async getGastroDiscountTicketMetrics(
    @CurrentUser() user: { tenantId: string },
    @Param('discountId') discountId: string,
    @Query('profileId') profileId?: string,
  ) {
    const resolvedProfileId =
      profileId?.trim() ??
      (await this.adminGastro.resolveProfileIdForDiscount(user.tenantId, discountId));
    if (!resolvedProfileId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    return this.adminGastro.getDiscountMetrics(
      user.tenantId,
      resolvedProfileId,
      discountId,
    );
  }

  @Patch('gastro-discount-tickets/:discountId/publication')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async updateGastroDiscountTicketPublication(
    @CurrentUser() user: { tenantId: string },
    @Param('discountId') discountId: string,
    @Query('profileId') profileId: string,
    @Body(new ZodValidationPipe(adminGastroDiscountPublicationSchema))
    body: AdminGastroDiscountPublication,
  ) {
    const resolvedProfileId =
      profileId?.trim() ??
      (await this.adminGastro.resolveProfileIdForDiscount(user.tenantId, discountId));
    if (!resolvedProfileId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    return this.adminGastro.updatePublication(
      user.tenantId,
      resolvedProfileId,
      discountId,
      body,
    );
  }

  @Post('gastro-discount-tickets/:discountId/mark-commission-negotiation')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async markGastroDiscountTicketCommissionNegotiation(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('discountId') discountId: string,
    @Query('profileId') profileId: string,
    @Body(new ZodValidationPipe(adminGastroDiscountActionNoteSchema))
    body: AdminGastroDiscountActionNote,
  ) {
    const resolvedProfileId =
      profileId?.trim() ??
      (await this.adminGastro.resolveProfileIdForDiscount(user.tenantId, discountId));
    if (!resolvedProfileId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    return this.adminGastro.markCommissionNegotiation(
      user.tenantId,
      user.id,
      user.role,
      resolvedProfileId,
      discountId,
      body.note,
    );
  }

  @Post('gastro-discount-tickets/:discountId/approve')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async approveGastroDiscountTicket(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('discountId') discountId: string,
    @Query('profileId') profileId: string,
  ) {
    const resolvedProfileId =
      profileId?.trim() ??
      (await this.adminGastro.resolveProfileIdForDiscount(user.tenantId, discountId));
    if (!resolvedProfileId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    return this.adminGastro.approve(
      user.tenantId,
      user.id,
      user.role,
      resolvedProfileId,
      discountId,
    );
  }

  @Post('gastro-discount-tickets/:discountId/reject')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async rejectGastroDiscountTicket(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('discountId') discountId: string,
    @Query('profileId') profileId: string,
    @Body(new ZodValidationPipe(adminGastroDiscountRejectSchema)) body: AdminGastroDiscountReject,
  ) {
    const resolvedProfileId =
      profileId?.trim() ??
      (await this.adminGastro.resolveProfileIdForDiscount(user.tenantId, discountId));
    if (!resolvedProfileId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    return this.adminGastro.reject(
      user.tenantId,
      user.id,
      user.role,
      resolvedProfileId,
      discountId,
      body.reason,
      body.note,
    );
  }

  @Post('gastro-discount-tickets/:discountId/cancel')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async cancelGastroDiscountTicket(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('discountId') discountId: string,
    @Query('profileId') profileId: string,
    @Body(new ZodValidationPipe(adminGastroDiscountCancelSchema)) body: AdminGastroDiscountCancel,
  ) {
    const resolvedProfileId =
      profileId?.trim() ??
      (await this.adminGastro.resolveProfileIdForDiscount(user.tenantId, discountId));
    if (!resolvedProfileId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    return this.adminGastro.cancel(
      user.tenantId,
      user.id,
      user.role,
      resolvedProfileId,
      discountId,
      body.reason,
      body.note,
    );
  }

  @Post('gastro-discount-tickets/:discountId/send-qr-email')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async sendGastroDiscountTicketQrEmail(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('discountId') discountId: string,
    @Query('profileId') profileId: string,
  ) {
    const resolvedProfileId =
      profileId?.trim() ??
      (await this.adminGastro.resolveProfileIdForDiscount(user.tenantId, discountId));
    if (!resolvedProfileId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    return this.adminGastro.sendQrEmail(
      user.tenantId,
      user.id,
      user.role,
      resolvedProfileId,
      discountId,
    );
  }

  @Get('gastronomicos')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listGastroLocations(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminGastroLocationsListQuerySchema))
    query: AdminGastroLocationsListQuery,
  ) {
    return this.adminGastro.listLocations(user.tenantId, query);
  }

  @Post('gastronomicos')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async createGastroLocation(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(adminGastroLocationCreateSchema))
    body: AdminGastroLocationCreateInput,
  ) {
    return this.adminGastroLocations.create(user.tenantId, user.id, body);
  }

  @Patch('gastronomicos/:profileId/status')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async updateGastroLocationStatus(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminGastroProfileIdParamsSchema)) params: AdminGastroProfileIdParams,
    @Body(new ZodValidationPipe(adminGastroLocationStatusPatchSchema))
    body: AdminGastroLocationStatusPatchInput,
  ) {
    return this.adminGastroLocations.updateStatus(
      user.tenantId,
      user.id,
      user.role,
      params.profileId,
      body,
    );
  }

  @Patch('gastronomicos/:profileId')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async updateGastroLocation(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param(new ZodValidationPipe(adminGastroProfileIdParamsSchema)) params: AdminGastroProfileIdParams,
    @Body(new ZodValidationPipe(adminGastroLocationUpdateSchema))
    body: AdminGastroLocationUpdateInput,
  ) {
    return this.adminGastroLocations.update(
      user.tenantId,
      user.id,
      params.profileId,
      body,
    );
  }

  @Get('gastronomicos/:profileId')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async getGastroLocation(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(adminGastroProfileIdParamsSchema)) params: AdminGastroProfileIdParams,
  ) {
    return this.adminGastro.getLocation(user.tenantId, params.profileId);
  }

  @Get('gastronomicos/:profileId/discuentos')
  @Get('gastronomicos/:profileId/discounts')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listGastroLocationDiscounts(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(adminGastroProfileIdParamsSchema)) params: AdminGastroProfileIdParams,
  ) {
    return this.adminGastro.listLocationDiscounts(user.tenantId, params.profileId);
  }

  @Get('gastronomicos/:profileId/discuentos/:discountId')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async getGastroLocationDiscount(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(adminGastroDiscountIdParamsSchema)) params: AdminGastroDiscountIdParams,
  ) {
    return this.adminGastro.getDiscountDetail(
      user.tenantId,
      params.profileId,
      params.discountId,
    );
  }

  @Get('gastronomicos/:profileId/discuentos/:discountId/metrics')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async getGastroLocationDiscountMetrics(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(adminGastroDiscountIdParamsSchema)) params: AdminGastroDiscountIdParams,
  ) {
    return this.adminGastro.getDiscountMetrics(
      user.tenantId,
      params.profileId,
      params.discountId,
    );
  }

  @Patch('gastronomicos/:profileId/discuentos/:discountId/publication')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async updateGastroDiscountPublication(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(adminGastroDiscountIdParamsSchema)) params: AdminGastroDiscountIdParams,
    @Body(new ZodValidationPipe(adminGastroDiscountPublicationSchema))
    body: AdminGastroDiscountPublication,
  ) {
    return this.adminGastro.updatePublication(
      user.tenantId,
      params.profileId,
      params.discountId,
      body,
    );
  }

  @Post('gastronomicos/:profileId/discuentos/:discountId/mark-commission-negotiation')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async markGastroDiscountCommissionNegotiation(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminGastroDiscountIdParamsSchema)) params: AdminGastroDiscountIdParams,
    @Body(new ZodValidationPipe(adminGastroDiscountActionNoteSchema))
    body: AdminGastroDiscountActionNote,
  ) {
    return this.adminGastro.markCommissionNegotiation(
      user.tenantId,
      user.id,
      user.role,
      params.profileId,
      params.discountId,
      body.note,
    );
  }

  @Post('gastronomicos/:profileId/discuentos/:discountId/approve')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async approveGastroDiscount(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminGastroDiscountIdParamsSchema)) params: AdminGastroDiscountIdParams,
  ) {
    return this.adminGastro.approve(
      user.tenantId,
      user.id,
      user.role,
      params.profileId,
      params.discountId,
    );
  }

  @Post('gastronomicos/:profileId/discuentos/:discountId/reject')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async rejectGastroDiscount(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminGastroDiscountIdParamsSchema)) params: AdminGastroDiscountIdParams,
    @Body(new ZodValidationPipe(adminGastroDiscountRejectSchema)) body: AdminGastroDiscountReject,
  ) {
    return this.adminGastro.reject(
      user.tenantId,
      user.id,
      user.role,
      params.profileId,
      params.discountId,
      body.reason,
      body.note,
    );
  }

  @Post('gastronomicos/:profileId/discuentos/:discountId/cancel')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async cancelGastroDiscount(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminGastroDiscountIdParamsSchema)) params: AdminGastroDiscountIdParams,
    @Body(new ZodValidationPipe(adminGastroDiscountCancelSchema)) body: AdminGastroDiscountCancel,
  ) {
    return this.adminGastro.cancel(
      user.tenantId,
      user.id,
      user.role,
      params.profileId,
      params.discountId,
      body.reason,
      body.note,
    );
  }

  @Post('gastronomicos/:profileId/discuentos/:discountId/send-qr-email')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async sendGastroDiscountQrEmail(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminGastroDiscountIdParamsSchema)) params: AdminGastroDiscountIdParams,
  ) {
    return this.adminGastro.sendQrEmail(
      user.tenantId,
      user.id,
      user.role,
      params.profileId,
      params.discountId,
    );
  }

  @Post('commissions/:id/confirm')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async confirmCommissionPayout(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') commissionId: string,
  ) {
    const result = await this.referrals.confirmCommissionPayout(
      user.tenantId,
      commissionId,
      user.id,
    );
    if (!result) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Commission not found or not in REQUESTED status',
      });
    }
    return result;
  }
}
