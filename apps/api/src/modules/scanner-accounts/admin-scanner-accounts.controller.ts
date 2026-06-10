import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  Role,
  adminScannerAccountsListQuerySchema,
  linkScannerAccountBodySchema,
  type AdminScannerAccountsListQuery,
  type LinkScannerAccountBody,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ScannerAccountsService } from './scanner-accounts.service';

@Controller('admin/scanner-accounts')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminScannerAccountsController {
  constructor(private readonly scannerAccounts: ScannerAccountsService) {}

  @Get()
  list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminScannerAccountsListQuerySchema))
    query: AdminScannerAccountsListQuery,
  ) {
    return this.scannerAccounts.listForAdmin(user.tenantId, query);
  }

  @Post()
  link(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(linkScannerAccountBodySchema)) body: LinkScannerAccountBody,
  ) {
    return this.scannerAccounts.linkScannerAccountAdmin(user, body);
  }
}
