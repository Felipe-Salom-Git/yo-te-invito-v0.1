import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { upsertTicketTemplateDtoSchema, type UpsertTicketTemplateDto } from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ProducerTicketTemplateService } from './producer-ticket-template.service';

@Controller('producer/events/:eventId/ticket-types/:ticketTypeId/ticket-template')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerTicketTemplateController {
  constructor(private readonly service: ProducerTicketTemplateService) {}

  @Get()
  async get(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
  ) {
    return this.service.getForType(user.tenantId, eventId, ticketTypeId, user.id, user.role);
  }

  @Put()
  async put(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Body(new ZodValidationPipe(upsertTicketTemplateDtoSchema)) body: UpsertTicketTemplateDto,
  ) {
    return this.service.upsertForType(user.tenantId, eventId, ticketTypeId, user.id, user.role, body);
  }

  @Delete()
  async remove(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
  ) {
    return this.service.deleteForType(user.tenantId, eventId, ticketTypeId, user.id, user.role);
  }
}
