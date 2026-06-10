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
  createEventOccurrenceBodySchema,
  eventOccurrencesListQuerySchema,
  updateEventOccurrenceBodySchema,
  type CreateEventOccurrenceBody,
  type EventOccurrencesListQuery,
  type UpdateEventOccurrenceBody,
  Role,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EventOccurrencesService } from '../event-occurrences/event-occurrences.service';
import { ProducerEventsCrudService } from './producer-events-crud.service';

@Controller('producer/events/:eventId/occurrences')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerEventOccurrencesController {
  constructor(
    private readonly occurrences: EventOccurrencesService,
    private readonly eventsCrud: ProducerEventsCrudService,
  ) {}

  private async assertAccess(
    user: { id: string; tenantId: string; role: string },
    eventId: string,
  ) {
    await this.eventsCrud.assertEventAccessForUser(
      eventId,
      user.tenantId,
      user.id,
      user.role,
    );
  }

  @Get()
  async list(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Query(new ZodValidationPipe(eventOccurrencesListQuerySchema))
    query: EventOccurrencesListQuery,
  ) {
    await this.assertAccess(user, eventId);
    return this.occurrences.getOccurrenceWithStats(user.tenantId, eventId);
  }

  @Post()
  async create(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(createEventOccurrenceBodySchema))
    body: CreateEventOccurrenceBody,
  ) {
    await this.assertAccess(user, eventId);
    return this.occurrences.createForEvent(user.tenantId, eventId, body);
  }

  @Patch(':occurrenceId')
  async update(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Param('occurrenceId') occurrenceId: string,
    @Body(new ZodValidationPipe(updateEventOccurrenceBodySchema))
    body: UpdateEventOccurrenceBody,
  ) {
    await this.assertAccess(user, eventId);
    return this.occurrences.updateOccurrence(
      user.tenantId,
      eventId,
      occurrenceId,
      body,
    );
  }

  @Delete(':occurrenceId')
  async remove(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Param('occurrenceId') occurrenceId: string,
  ) {
    await this.assertAccess(user, eventId);
    await this.occurrences.deleteOccurrence(user.tenantId, eventId, occurrenceId);
    return { ok: true };
  }
}
