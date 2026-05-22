import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProducerDashboardMetricsService } from './producer-dashboard-metrics.service';

@Controller('producer/dashboard')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerDashboardController {
  constructor(private readonly dashboard: ProducerDashboardMetricsService) {}

  @Get('metrics')
  getMetrics(@CurrentUser() user: { id: string; tenantId: string; role: string }) {
    return this.dashboard.getDashboard(user.tenantId, user.id, user.role);
  }
}
