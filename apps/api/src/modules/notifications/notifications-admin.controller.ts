import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@yo-te-invito/shared';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { UserNotificationsService } from './user-notifications.service';

/** Dev/admin: ejecutar jobs de notificación sin esperar al cron. */
@Controller('admin/notifications')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class NotificationsAdminController {
  constructor(
    private readonly scheduler: NotificationsSchedulerService,
    private readonly notifications: UserNotificationsService,
  ) {}

  @Post('run')
  runNow() {
    return this.scheduler.runAllJobs();
  }

  /** Una notificación in-app + email (idempotente por referenceKey) para E2E/smoke. */
  @Post('seed-demo')
  seedDemo(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.notifications.seedE2eDemo(user.tenantId, user.id);
  }
}
