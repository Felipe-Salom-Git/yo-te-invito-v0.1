import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  refreshPaymentStatusParamsSchema,
  refreshPaymentStatusQuerySchema,
  refreshPaymentStatusPostParamsSchema,
  refreshPaymentStatusPostQuerySchema,
  type RefreshPaymentStatusParams,
  type RefreshPaymentStatusQuery,
  type RefreshPaymentStatusPostParams,
  type RefreshPaymentStatusPostQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PublicPaymentsService } from './public-payments.service';
import { CheckoutPaymentStatusService } from './checkout-payment-status.service';

@Controller('public/payments')
export class PublicPaymentsRefreshController {
  constructor(
    private readonly service: PublicPaymentsService,
    private readonly checkoutStatus: CheckoutPaymentStatusService,
  ) {}

  @Get(':paymentId/status')
  async getStatus(
    @Param(new ZodValidationPipe(refreshPaymentStatusParamsSchema))
    params: RefreshPaymentStatusParams,
    @Query(new ZodValidationPipe(refreshPaymentStatusQuerySchema))
    query: RefreshPaymentStatusQuery,
  ) {
    return this.service.refreshPaymentStatus(params.paymentId, query.tenantId);
  }

  @Post(':paymentId/refresh-status')
  @HttpCode(HttpStatus.OK)
  async refreshStatus(
    @Param(new ZodValidationPipe(refreshPaymentStatusPostParamsSchema))
    params: RefreshPaymentStatusPostParams,
    @Query(new ZodValidationPipe(refreshPaymentStatusPostQuerySchema))
    query: RefreshPaymentStatusPostQuery,
  ) {
    return this.checkoutStatus.refreshAndGetCheckoutStatus(
      params.paymentId,
      query.tenantId,
    );
  }
}
