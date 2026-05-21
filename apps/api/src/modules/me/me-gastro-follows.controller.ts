import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createUserGastroFollowBodySchema,
  patchUserGastroFollowNotificationsSchema,
} from '@yo-te-invito/shared';
import type {
  CreateUserGastroFollowBody,
  PatchUserGastroFollowNotifications,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserGastroFollowsService } from './user-gastro-follows.service';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MeGastroFollowsController {
  constructor(private readonly follows: UserGastroFollowsService) {}

  @Get('gastro-follows')
  list(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.follows.list(user.tenantId, user.id);
  }

  @Get('gastro-follows/status')
  status(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query('gastroProfileId') gastroProfileId: string,
  ) {
    return this.follows.getStatus(user.tenantId, user.id, gastroProfileId);
  }

  @Post('gastro-follows')
  create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(createUserGastroFollowBodySchema))
    body: CreateUserGastroFollowBody,
  ) {
    return this.follows.create(user.tenantId, user.id, body);
  }

  @Delete('gastro-follows/:id')
  remove(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.follows.remove(user.tenantId, user.id, id);
  }

  @Patch('gastro-follows/:id/notifications')
  patchNotifications(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(patchUserGastroFollowNotificationsSchema))
    body: PatchUserGastroFollowNotifications,
  ) {
    return this.follows.patchNotifications(user.tenantId, user.id, id, body);
  }
}
