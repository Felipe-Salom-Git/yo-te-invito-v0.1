import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  createTicketTypeDtoSchema,
  updateTicketTypeDtoSchema,
  type CreateTicketTypeDto,
  type UpdateTicketTypeDto,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ProducerTicketTypesService } from './producer-ticket-types.service';

@Controller('producer/events/:eventId/ticket-types')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerTicketTypesController {
  constructor(private readonly service: ProducerTicketTypesService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(createTicketTypeDtoSchema)) body: CreateTicketTypeDto,
  ) {
    return this.service.create(
      user.tenantId,
      eventId,
      user.id,
      user.role,
      body,
    );
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTicketTypeDtoSchema)) body: UpdateTicketTypeDto,
  ) {
    return this.service.update(
      user.tenantId,
      eventId,
      id,
      user.id,
      user.role,
      body,
    );
  }
}
