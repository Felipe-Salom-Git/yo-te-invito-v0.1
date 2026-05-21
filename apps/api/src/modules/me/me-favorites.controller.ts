import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  createUserFavoriteBodySchema,
  patchUserFavoriteNotificationsSchema,
} from '@yo-te-invito/shared';
import type {
  CreateUserFavoriteBody,
  PatchUserFavoriteNotifications,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserFavoritesService } from './user-favorites.service';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MeFavoritesController {
  constructor(private readonly favorites: UserFavoritesService) {}

  @Get('favorites')
  list(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.favorites.list(user.tenantId, user.id);
  }

  @Post('favorites')
  create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(createUserFavoriteBodySchema)) body: CreateUserFavoriteBody,
  ) {
    return this.favorites.create(user.tenantId, user.id, body);
  }

  @Delete('favorites/:id')
  remove(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.favorites.remove(user.tenantId, user.id, id);
  }

  @Patch('favorites/:id/notifications')
  patchNotifications(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
    @Body(new ZodValidationPipe(patchUserFavoriteNotificationsSchema))
    body: PatchUserFavoriteNotifications,
  ) {
    return this.favorites.patchNotifications(user.tenantId, user.id, id, body);
  }
}
