import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  addUserCartItemBodySchema,
  meCartCheckoutBodySchema,
  patchUserCartItemBodySchema,
} from '@yo-te-invito/shared';
import type {
  AddUserCartItemBody,
  MeCartCheckoutBody,
  PatchUserCartItemBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserCartService } from './user-cart.service';

@Controller('me')
@UseGuards(JwtOrDevAuthGuard)
export class MeCartController {
  constructor(private readonly cart: UserCartService) {}

  @Get('cart')
  getCart(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.cart.getCart(user.tenantId, user.id);
  }

  @Get('cart/pending-orders')
  listPendingOrders(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.cart.listPendingOrders(user.tenantId, user.id);
  }

  @Post('cart/items')
  addItem(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(addUserCartItemBodySchema)) body: AddUserCartItemBody,
  ) {
    return this.cart.addItem(user.tenantId, user.id, body);
  }

  @Patch('cart/items/:itemId')
  updateItem(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(patchUserCartItemBodySchema)) body: PatchUserCartItemBody,
  ) {
    return this.cart.updateItem(user.tenantId, user.id, itemId, body);
  }

  @Delete('cart/items/:itemId')
  removeItem(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('itemId') itemId: string,
  ) {
    return this.cart.removeItem(user.tenantId, user.id, itemId);
  }

  @Post('cart/checkout')
  checkout(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(meCartCheckoutBodySchema)) body: MeCartCheckoutBody,
  ) {
    return this.cart.checkout(user.tenantId, user.id, body);
  }
}
