import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  refreshPaymentStatusParamsSchema,
  refreshPaymentStatusQuerySchema,
  type RefreshPaymentStatusParams,
  type RefreshPaymentStatusQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PublicPaymentsService } from './public-payments.service';

@Controller('public/payments')
export class PublicPaymentsRefreshController {
  constructor(private readonly service: PublicPaymentsService) {}

  @Get(':paymentId/status')
  async getStatus(
    @Param(new ZodValidationPipe(refreshPaymentStatusParamsSchema))
    params: RefreshPaymentStatusParams,
    @Query(new ZodValidationPipe(refreshPaymentStatusQuerySchema))
    query: RefreshPaymentStatusQuery,
  ) {
    return this.service.refreshPaymentStatus(params.paymentId, query.tenantId);
  }
}
