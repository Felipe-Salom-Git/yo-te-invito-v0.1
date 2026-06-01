import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  adminPaymentMarkReviewedInputSchema,
  adminPaymentParamsSchema,
  adminPaymentsListQuerySchema,
  Role,
  type AdminPaymentMarkReviewedInput,
  type AdminPaymentParams,
  type AdminPaymentsListQuery,
} from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminPaymentsService } from './admin-payments.service';

@Controller('admin/payments')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminPaymentsController {
  constructor(private readonly payments: AdminPaymentsService) {}

  @Get()
  list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminPaymentsListQuerySchema))
    query: AdminPaymentsListQuery,
  ) {
    return this.payments.list(user.tenantId, query);
  }

  @Get(':paymentId')
  getDetail(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(adminPaymentParamsSchema))
    params: AdminPaymentParams,
  ) {
    return this.payments.getDetail(user.tenantId, params.paymentId);
  }

  @Post(':paymentId/reconcile')
  @HttpCode(HttpStatus.OK)
  reconcile(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminPaymentParamsSchema))
    params: AdminPaymentParams,
  ) {
    return this.payments.reconcile(user.tenantId, params.paymentId, {
      id: user.id,
      role: user.role,
    });
  }

  @Post(':paymentId/mark-reviewed')
  @HttpCode(HttpStatus.OK)
  markReviewed(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminPaymentParamsSchema))
    params: AdminPaymentParams,
    @Body(new ZodValidationPipe(adminPaymentMarkReviewedInputSchema))
    body: AdminPaymentMarkReviewedInput,
  ) {
    return this.payments.markReviewed(user.tenantId, params.paymentId, {
      id: user.id,
      role: user.role,
    }, body);
  }
}
