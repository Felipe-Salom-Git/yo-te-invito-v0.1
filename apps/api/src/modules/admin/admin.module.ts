import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminEventsService } from './admin-events.service';
import { AdminAuditService } from './admin-audit.service';

@Module({
  controllers: [AdminController],
  providers: [AdminEventsService, AdminAuditService],
})
export class AdminModule {}
