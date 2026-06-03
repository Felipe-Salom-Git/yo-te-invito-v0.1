import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  createPaymentQuerySchema,
  createPaymentParamsSchema,
  createPaymentBodySchema,
  orderPaymentStatusParamsSchema,
  orderPaymentStatusQuerySchema,
  checkoutPaymentStatusParamsSchema,
  checkoutPaymentStatusQuerySchema,
  type CreatePaymentQuery,
  type CreatePaymentParams,
  type CreatePaymentBody,
  type OrderPaymentStatusParams,
  type OrderPaymentStatusQuery,
  type CheckoutPaymentStatusParams,
  type CheckoutPaymentStatusQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PublicPaymentsService } from './public-payments.service';
import { CheckoutPaymentStatusService } from './checkout-payment-status.service';

@Controller('public/orders')
export class PublicOrderPaymentsController {
  constructor(
    private readonly service: PublicPaymentsService,
    private readonly checkoutStatus: CheckoutPaymentStatusService,
  ) {}

  @Get(':orderId/checkout-status')
  async getCheckoutStatus(
    @Param(new ZodValidationPipe(checkoutPaymentStatusParamsSchema))
    params: CheckoutPaymentStatusParams,
    @Query(new ZodValidationPipe(checkoutPaymentStatusQuerySchema))
    query: CheckoutPaymentStatusQuery,
  ) {
    const cancelled =
      query.cancelled === '1' || query.cancelled === 'true';
    return this.checkoutStatus.getCheckoutStatus(params.orderId, query.tenantId, {
      urlCancelledHint: cancelled,
      paymentId: query.paymentId,
    });
  }

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
