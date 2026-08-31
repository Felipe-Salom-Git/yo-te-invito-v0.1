import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  Role,
  courtesyCreditLedgerListQuerySchema,
  courtesyCreditPartnerBalanceQuerySchema,
  createCourtesyCreditAdjustmentBodySchema,
  reverseCourtesyCreditLedgerEntryBodySchema,
  type CourtesyCreditLedgerListQuery,
  type CourtesyCreditPartnerBalanceQuery,
  type CreateCourtesyCreditAdjustmentBody,
  type ReverseCourtesyCreditLedgerEntryBody,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CourtesyCreditLedgerService } from './courtesy-credit-ledger.service';

@Controller('admin/courtesy-credit-ledger')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminCourtesyCreditLedgerController {
  constructor(private readonly ledger: CourtesyCreditLedgerService) {}

  @Get()
  list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(courtesyCreditLedgerListQuerySchema))
    query: CourtesyCreditLedgerListQuery,
  ) {
    return this.ledger.list(user.tenantId, query);
  }

  @Get('balance')
  balance(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(courtesyCreditPartnerBalanceQuerySchema))
    query: CourtesyCreditPartnerBalanceQuery,
  ) {
    return this.ledger.getPartnerBalance(user.tenantId, query);
  }

  @Post('adjustments')
  createAdjustment(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Body(new ZodValidationPipe(createCourtesyCreditAdjustmentBodySchema))
    body: CreateCourtesyCreditAdjustmentBody,
  ) {
    return this.ledger.createAdjustment(user.tenantId, user, body);
  }

  @Post(':entryId/reverse')
  reverse(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('entryId') entryId: string,
    @Body(new ZodValidationPipe(reverseCourtesyCreditLedgerEntryBodySchema))
    body: ReverseCourtesyCreditLedgerEntryBody,
  ) {
    return this.ledger.reverseEntry(user.tenantId, user, entryId, body);
  }
}
