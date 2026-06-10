import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ScannerAccountsService } from './scanner-accounts.service';

@Controller('producer/scanners')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
export class ProducerScannerAccountsController {
  constructor(private readonly scannerAccounts: ScannerAccountsService) {}

  @Get()
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  list(@CurrentUser() user: { id: string; tenantId: string; role: string }) {
    return this.scannerAccounts.listForProducer(user);
  }
}
