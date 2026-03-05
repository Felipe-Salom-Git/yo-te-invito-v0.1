import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  auditLogsListQuerySchema,
  type AuditLogsListQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DevAuthGuard } from '../../common/guards/dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { AdminEventsService } from './admin-events.service';
import { AdminAuditService } from './admin-audit.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly events: AdminEventsService,
    private readonly audit: AdminAuditService,
  ) {}

  @Post('events/:eventId/approve')
  @UseGuards(DevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async approveEvent(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
  ) {
    return this.events.approveEvent(
      user.tenantId,
      user.id,
      user.role,
      eventId,
    );
  }

  @Get('audit-logs')
  @UseGuards(DevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listAuditLogs(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(auditLogsListQuerySchema)) query: AuditLogsListQuery,
  ) {
    return this.audit.list({
      ...query,
      tenantId: user.tenantId,
    });
  }
}
