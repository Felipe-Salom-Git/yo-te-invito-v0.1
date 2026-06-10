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

  @Post()
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  create(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(createScannerUserBodySchema)) body: CreateScannerUserBody,
  ) {
    return this.scannerAccounts.createForProducer(user, body);
  }

  @Patch(':accountId')
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  updateStatus(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('accountId') accountId: string,
    @Body(new ZodValidationPipe(updateScannerAccountStatusBodySchema))
    body: UpdateScannerAccountStatusBody,
  ) {
    return this.scannerAccounts.updateProducerAccountStatus(user, accountId, body.isActive);
  }

  @Post(':accountId/reset-password')
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  resetPassword(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('accountId') accountId: string,
    @Body(new ZodValidationPipe(resetScannerPasswordBodySchema)) body: ResetScannerPasswordBody,
  ) {
    return this.scannerAccounts.resetProducerPassword(user, accountId, body);
  }
}
