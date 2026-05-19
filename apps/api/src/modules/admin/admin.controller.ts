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
} from '@yo-te-invito/shared';
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
import { AdminUsersService } from './admin-users.service';
import { AdminConfigService } from './admin-config.service';
import { AdminApplicationsService } from './admin-applications.service';
import { AdminProfilesService } from './admin-profiles.service';
import { ReferralsService } from '../referrals/referrals.service';
import { InboxService } from '../inbox/inbox.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly events: AdminEventsService,
    private readonly audit: AdminAuditService,
    private readonly tickets: AdminTicketsService,
    private readonly fraud: AdminFraudService,
    private readonly platformMetrics: PlatformMetricsService,
    private readonly users: AdminUsersService,
    private readonly config: AdminConfigService,
    private readonly applications: AdminApplicationsService,
    private readonly profiles: AdminProfilesService,
    private readonly referrals: ReferralsService,
    private readonly inbox: InboxService,
  ) {}

  @Get('events')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listEvents(
    @CurrentUser() user: { tenantId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.events.list(
      user.tenantId,
      page ? parseInt(page, 10) || 1 : 1,
      limit ? parseInt(limit, 10) || 50 : 50,
      status || undefined,
    );
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
