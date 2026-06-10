import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  Role,
  createScannerUserBodySchema,
  resetScannerPasswordBodySchema,
  updateScannerAccountStatusBodySchema,
  type CreateScannerUserBody,
  type ResetScannerPasswordBody,
  type UpdateScannerAccountStatusBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
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

  @Post()
  @RequireRole(Role.ADMIN, Role.GASTRO_OWNER)
  create(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(createScannerUserBodySchema)) body: CreateScannerUserBody,
  ) {
    return this.scannerAccounts.createForGastro(user, body);
  }

  @Patch(':accountId')
  @RequireRole(Role.ADMIN, Role.GASTRO_OWNER)
  updateStatus(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('accountId') accountId: string,
    @Body(new ZodValidationPipe(updateScannerAccountStatusBodySchema))
    body: UpdateScannerAccountStatusBody,
  ) {
    return this.scannerAccounts.updateGastroAccountStatus(user, accountId, body.isActive);
  }

  @Post(':accountId/reset-password')
  @RequireRole(Role.ADMIN, Role.GASTRO_OWNER)
  resetPassword(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('accountId') accountId: string,
    @Body(new ZodValidationPipe(resetScannerPasswordBodySchema)) body: ResetScannerPasswordBody,
  ) {
    return this.scannerAccounts.resetGastroPassword(user, accountId, body);
  }
}
