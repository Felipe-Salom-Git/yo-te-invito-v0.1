import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { GastroRolesGuard } from '../../common/guards/gastro-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ScannerAccountsService } from './scanner-accounts.service';

@Controller('gastro/scanners')
@UseGuards(JwtOrDevAuthGuard, GastroRolesGuard)
export class GastroScannerAccountsController {
  constructor(private readonly scannerAccounts: ScannerAccountsService) {}

  @Get()
  @RequireRole(Role.ADMIN, Role.GASTRO_OWNER)
  list(@CurrentUser() user: { id: string; tenantId: string; role: string }) {
    return this.scannerAccounts.listForGastro(user);
  }
}
