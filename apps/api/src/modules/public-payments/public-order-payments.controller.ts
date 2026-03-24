import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  createPaymentQuerySchema,
  createPaymentParamsSchema,
  createPaymentBodySchema,
  orderPaymentStatusParamsSchema,
  orderPaymentStatusQuerySchema,
  type CreatePaymentQuery,
  type CreatePaymentParams,
  type CreatePaymentBody,
  type OrderPaymentStatusParams,
  type OrderPaymentStatusQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PublicPaymentsService } from './public-payments.service';

@Controller('public/orders')
export class PublicOrderPaymentsController {
  constructor(private readonly service: PublicPaymentsService) {}

  @Get(':orderId/payment-status')
  async getOrderPaymentStatus(
    @Param(new ZodValidationPipe(orderPaymentStatusParamsSchema))
    params: OrderPaymentStatusParams,
    @Query(new ZodValidationPipe(orderPaymentStatusQuerySchema))
    query: OrderPaymentStatusQuery,
  ) {
    return this.service.getOrderPaymentStatus(params.orderId, query.tenantId);
  }

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
