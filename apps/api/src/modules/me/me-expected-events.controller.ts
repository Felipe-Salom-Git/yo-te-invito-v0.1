import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  createUserExpectedEventBodySchema,
  patchUserExpectedEventNotificationsSchema,
} from '@yo-te-invito/shared';
import type {
  CreateUserExpectedEventBody,
  PatchUserExpectedEventNotifications,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserExpectedEventsService } from './user-expected-events.service';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MeExpectedEventsController {
  constructor(private readonly expected: UserExpectedEventsService) {}

  @Get('expected-events')
  list(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.expected.list(user.tenantId, user.id);
  }

  @Post('expected-events')
  create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(createUserExpectedEventBodySchema))
    body: CreateUserExpectedEventBody,
  ) {
    return this.expected.create(user.tenantId, user.id, body);
  }

  @Delete('expected-events/:id')
  remove(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.expected.remove(user.tenantId, user.id, id);
  }

  @Patch('expected-events/:id/notifications')
  patchNotifications(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(patchUserExpectedEventNotificationsSchema))
    body: PatchUserExpectedEventNotifications,
  ) {
    return this.expected.patchNotifications(user.tenantId, user.id, id, body);
  }
}
