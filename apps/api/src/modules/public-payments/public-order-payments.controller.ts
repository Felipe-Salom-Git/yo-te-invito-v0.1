import { Body, Controller, Param, Post, Query } from '@nestjs/common';
import {
  createPaymentQuerySchema,
  createPaymentParamsSchema,
  createPaymentBodySchema,
  type CreatePaymentQuery,
  type CreatePaymentParams,
  type CreatePaymentBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PublicPaymentsService } from './public-payments.service';

@Controller('public/orders')
export class PublicOrderPaymentsController {
  constructor(private readonly service: PublicPaymentsService) {}

  @Post(':orderId/payments')
  async createPayment(
    @Param(new ZodValidationPipe(createPaymentParamsSchema))
    params: CreatePaymentParams,
    @Query(new ZodValidationPipe(createPaymentQuerySchema))
    query: CreatePaymentQuery,
    @Body(new ZodValidationPipe(createPaymentBodySchema)) body: CreatePaymentBody,
  ) {
    return this.service.createPayment(
      params.orderId,
      query.tenantId,
      body.provider,
    );
  }
}
