import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  createOrderDtoSchema,
  orderDetailsQuerySchema,
  ticketTypesQuerySchema,
  type CreateOrderDto,
  type OrderDetailsQuery,
  type TicketTypesQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PublicOrdersService } from './public-orders.service';

@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly service: PublicOrdersService) {}

  @Post()
  async create(
    @Query(new ZodValidationPipe(ticketTypesQuerySchema)) query: TicketTypesQuery,
    @Body(new ZodValidationPipe(createOrderDtoSchema)) body: CreateOrderDto,
  ) {
    return this.service.create(query.tenantId, body);
  }

  @Get(':orderId')
  async get(
    @Param('orderId') orderId: string,
    @Query(new ZodValidationPipe(orderDetailsQuerySchema)) query: OrderDetailsQuery,
  ) {
    return this.service.getById(orderId, query.tenantId);
  }
}
