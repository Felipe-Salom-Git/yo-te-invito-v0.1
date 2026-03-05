import { Body, Controller, Param, Post, Query } from '@nestjs/common';
import {
  confirmDemoPaymentQuerySchema,
  confirmDemoPaymentParamsSchema,
  confirmDemoPaymentBodySchema,
  type ConfirmDemoPaymentQuery,
  type ConfirmDemoPaymentParams,
  type ConfirmDemoPaymentBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PublicPaymentsService } from './public-payments.service';

@Controller('public/payments')
export class PublicPaymentsDemoController {
  constructor(private readonly service: PublicPaymentsService) {}

  @Post(':paymentId/demo-confirm')
  async confirmDemo(
    @Param(new ZodValidationPipe(confirmDemoPaymentParamsSchema))
    params: ConfirmDemoPaymentParams,
    @Query(new ZodValidationPipe(confirmDemoPaymentQuerySchema))
    query: ConfirmDemoPaymentQuery,
    @Body(new ZodValidationPipe(confirmDemoPaymentBodySchema))
    _body: ConfirmDemoPaymentBody,
  ) {
    return this.service.confirmDemoPayment(params.paymentId, query.tenantId);
  }
}
