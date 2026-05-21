import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  changePasswordBodySchema,
  patchMeAccountBodySchema,
  userPortalPreferencesPatchSchema,
} from '@yo-te-invito/shared';
import type {
  ChangePasswordBody,
  PatchMeAccountBody,
  UserPortalPreferencesPatch,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MeDashboardService } from './me-dashboard.service';
import { MeActivityService } from './me-activity.service';
import { MeAccountService } from './me-account.service';
import { MeService } from './me.service';
import { TicketTransferOfferService } from './ticket-transfer-offer.service';
import {
  meTicketTransferOffersQuerySchema,
  type MeTicketTransferOffersQuery,
} from '@yo-te-invito/shared';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MePortalController {
  constructor(
    private readonly dashboard: MeDashboardService,
    private readonly activity: MeActivityService,
    private readonly account: MeAccountService,
    private readonly meService: MeService,
    private readonly transfers: TicketTransferOfferService,
  ) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.dashboard.getDashboard(user.tenantId, user.id);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.meService.getPreferences(user.tenantId, user.id);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(userPortalPreferencesPatchSchema))
    body: UserPortalPreferencesPatch,
  ) {
    return this.meService.updatePreferences(user.tenantId, user.id, body);
  }

  @Get('activity')
  getActivity(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.activity.getActivity(user.tenantId, user.id);
  }

  @Get('activity/attended')
  getAttended(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.activity.getAttended(user.tenantId, user.id);
  }

  @Get('activity/reviews')
  getReviews(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.activity.getMyReviews(user.tenantId, user.id);
  }

  @Get('activity/transfers')
  getTransfers(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query(new ZodValidationPipe(meTicketTransferOffersQuerySchema))
    query: MeTicketTransferOffersQuery,
  ) {
    return this.transfers.listForUser(user.tenantId, user.id, query);
  }

  @Get('account')
  getAccount(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.account.getAccount(user.tenantId, user.id);
  }

  @Patch('account')
  patchAccount(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(patchMeAccountBodySchema)) body: PatchMeAccountBody,
  ) {
    return this.account.patchAccount(user.tenantId, user.id, body);
  }

  @Post('account/change-password')
  changePassword(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(changePasswordBodySchema)) body: ChangePasswordBody,
  ) {
    return this.account.changePassword(user.tenantId, user.id, body);
  }
}
