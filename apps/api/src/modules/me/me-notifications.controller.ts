import { Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserNotificationsService } from '../notifications/user-notifications.service';

@Controller('me/notifications')
@UseGuards(JwtOrDevAuthGuard)
export class MeNotificationsController {
  constructor(private readonly notifications: UserNotificationsService) {}

  @Get()
  list(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.notifications.list(user.tenantId, user.id);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.notifications.unreadCount(user.tenantId, user.id);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.notifications.markRead(user.tenantId, user.id, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.notifications.markAllRead(user.tenantId, user.id);
  }
}
