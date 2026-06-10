import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ScannerAccountsService } from './scanner-accounts.service';

@Controller('scanner/account')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
export class ScannerAccountSelfController {
  constructor(private readonly scannerAccounts: ScannerAccountsService) {}

  @Get()
  @RequireRole(Role.SCANNER, Role.ADMIN)
  getSelf(@CurrentUser() user: { id: string; tenantId: string; role: string }) {
    return this.scannerAccounts.getSelfForScanner(user);
  }
}
