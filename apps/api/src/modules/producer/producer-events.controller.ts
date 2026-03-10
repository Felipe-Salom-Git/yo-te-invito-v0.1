import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  producerEventMetricsParamsSchema,
  eventCreateDtoSchema,
  eventUpdateDtoSchema,
  type ProducerEventMetricsParams,
  type EventCreateDto,
  type EventUpdateDto,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { EventMetricsService } from './event-metrics.service';
import { ProducerEventsCrudService } from './producer-events-crud.service';
import { ProducerTicketTypesService } from './producer-ticket-types.service';
import { ReferralsService } from '../referrals/referrals.service';

@Controller('producer/events')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerEventsController {
  constructor(
    private readonly metrics: EventMetricsService,
    private readonly crud: ProducerEventsCrudService,
    private readonly ticketTypesService: ProducerTicketTypesService,
    private readonly referralsService: ReferralsService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.crud.list(
      user.tenantId,
      user.id,
      user.role,
      page ? parseInt(page, 10) || 1 : 1,
      limit ? parseInt(limit, 10) || 50 : 50,
      status || undefined,
    );
  }

  @Get(':eventId')
  async getDetail(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
  ) {
    return this.crud.getDetail(user.tenantId, eventId, user.id, user.role);
  }

  @Post()
  async create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(eventCreateDtoSchema)) body: EventCreateDto,
  ) {
    return this.crud.create(user.tenantId, user.id, body);
  }

  @Patch(':eventId')
  async update(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(eventUpdateDtoSchema)) body: EventUpdateDto,
  ) {
    return this.crud.update(
      user.tenantId,
      eventId,
      user.id,
      user.role,
      body,
    );
  }

  @Get(':eventId/tickets')
  async getEventTickets(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
  ) {
    return this.ticketTypesService.getEventTicketsForProducer(
      user.tenantId,
      eventId,
      user.id,
      user.role,
    );
  }

  @Get(':eventId/commission-requests')
  async getCommissionRequests(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
  ) {
    return {
      commissions: await this.referralsService.listCommissionRequestsForEvent(
        user.tenantId,
        eventId,
        user.id,
        user.role,
      ),
    };
  }

  @Get(':eventId/metrics')
  async getMetrics(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(producerEventMetricsParamsSchema))
    params: ProducerEventMetricsParams,
  ) {
    return this.metrics.getMetrics(user.tenantId, params.eventId);
  }
}
