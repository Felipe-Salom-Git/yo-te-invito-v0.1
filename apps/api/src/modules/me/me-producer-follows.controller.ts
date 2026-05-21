import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createUserProducerFollowBodySchema,
  patchUserProducerFollowNotificationsSchema,
} from '@yo-te-invito/shared';
import type {
  CreateUserProducerFollowBody,
  PatchUserProducerFollowNotifications,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserProducerFollowsService } from './user-producer-follows.service';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MeProducerFollowsController {
  constructor(private readonly follows: UserProducerFollowsService) {}

  @Get('producer-follows')
  list(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.follows.list(user.tenantId, user.id);
  }

  @Get('producer-follows/status')
  status(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query('producerProfileId') producerProfileId: string,
  ) {
    return this.follows.getStatus(user.tenantId, user.id, producerProfileId);
  }

  @Post('producer-follows')
  create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(createUserProducerFollowBodySchema))
    body: CreateUserProducerFollowBody,
  ) {
    return this.follows.create(user.tenantId, user.id, body);
  }

  @Delete('producer-follows/:id')
  remove(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.follows.remove(user.tenantId, user.id, id);
  }

  @Patch('producer-follows/:id/notifications')
  patchNotifications(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(patchUserProducerFollowNotificationsSchema))
    body: PatchUserProducerFollowNotifications,
  ) {
    return this.follows.patchNotifications(user.tenantId, user.id, id, body);
  }
}
