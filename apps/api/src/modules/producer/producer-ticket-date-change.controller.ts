import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  producerTicketDateChangeListQuerySchema,
  rejectTicketDateChangeBodySchema,
  Role,
  type ProducerTicketDateChangeListQuery,
  type RejectTicketDateChangeBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TicketDateChangeService } from '../tickets/ticket-date-change.service';
import { ProducerEventsCrudService } from './producer-events-crud.service';

@Controller('producer')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerTicketDateChangeController {
  constructor(
    private readonly dateChanges: TicketDateChangeService,
    private readonly eventsCrud: ProducerEventsCrudService,
  ) {}

  @Get('events/:eventId/date-change-requests')
  async list(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Query(new ZodValidationPipe(producerTicketDateChangeListQuerySchema))
    query: ProducerTicketDateChangeListQuery,
  ) {
    await this.eventsCrud.assertEventAccessForUser(
      eventId,
      user.tenantId,
      user.id,
      user.role,
    );
    return this.dateChanges.listForProducer(user.tenantId, eventId, query);
  }

  @Post('date-change-requests/:requestId/approve')
  async approve(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('requestId') requestId: string,
  ) {
    await this.dateChanges.assertProducerRequestAccess(
      user.tenantId,
      user.id,
      user.role,
      requestId,
    );
    return this.dateChanges.approve(user.tenantId, user.id, user.role, requestId);
  }

  @Post('date-change-requests/:requestId/reject')
  async reject(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('requestId') requestId: string,
    @Body(new ZodValidationPipe(rejectTicketDateChangeBodySchema))
    body: RejectTicketDateChangeBody,
  ) {
    await this.dateChanges.assertProducerRequestAccess(
      user.tenantId,
      user.id,
      user.role,
      requestId,
    );
    return this.dateChanges.reject(user.tenantId, user.id, user.role, requestId, body);
  }
}
