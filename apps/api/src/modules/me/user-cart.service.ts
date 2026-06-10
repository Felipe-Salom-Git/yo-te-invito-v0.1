import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicOrdersService } from '../../public/public-orders.service';
import type {
  AddUserCartItemBody,
  MeCartCheckoutBody,
  MeCartCheckoutResponse,
  MeCartResponse,
  MePendingOrdersResponse,
  PatchUserCartItemBody,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class UserCartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicOrders: PublicOrdersService,
  ) {}

  private async getOrCreateCart(tenantId: string, userId: string) {
    const existing = await this.prisma.userCart.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (existing) return existing;
    return this.prisma.userCart.create({
      data: { tenantId, userId },
    });
  }

  async getCart(tenantId: string, userId: string): Promise<MeCartResponse> {
    const cart = await this.getOrCreateCart(tenantId, userId);
    const items = await this.prisma.userCartItem.findMany({
      where: { cartId: cart.id },
      include: {
        event: { select: { id: true, title: true, category: true } },
        ticketType: { select: { id: true, name: true, currency: true } },
        occurrence: { select: { startAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    let subtotal = 0;
    const mapped = items.map((row) => {
      const line = Number(row.unitPrice) * row.quantity;
      subtotal += line;
      return {
        id: row.id,
        eventId: row.eventId,
        ticketTypeId: row.ticketTypeId,
        occurrenceId: row.occurrenceId,
        quantity: row.quantity,
        unitPrice: row.unitPrice.toString(),
        eventTitle: row.event.title,
        ticketTypeName: row.ticketType.name,
        occurrenceStartAt: row.occurrence?.startAt.toISOString() ?? null,
        category: row.event.category ?? 'event',
      };
    });

    const currency = items[0]?.ticketType.currency ?? 'ARS';
    return {
      cartId: cart.id,
      items: mapped,
      subtotal: subtotal.toFixed(2),
      currency,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
    };
  }

  async addItem(
    tenantId: string,
    userId: string,
    body: AddUserCartItemBody,
  ): Promise<MeCartResponse> {
    if (body.tenantId !== tenantId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'tenantId mismatch',
      });
    }

    const ticketType = await this.prisma.ticketType.findFirst({
      where: {
        id: body.ticketTypeId,
        eventId: body.eventId,
        event: { tenantId, deletedAt: null, status: 'APPROVED' },
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
    if (!ticketType) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Ticket type not found',
      });
    }

    const occurrenceCount = await this.prisma.eventOccurrence.count({
      where: { eventId: body.eventId, status: { not: 'CANCELLED' } },
    });
    if (occurrenceCount > 0) {
      if (!body.occurrenceId) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'occurrenceId is required for multi-date events',
        });
      }
      if (ticketType.occurrenceId && ticketType.occurrenceId !== body.occurrenceId) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Ticket type does not belong to selected date',
        });
      }
    }

    if (body.quantity > ticketType.maxPerOrder) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Max ${ticketType.maxPerOrder} per order`,
      });
    }

    const cart = await this.getOrCreateCart(tenantId, userId);
    await this.prisma.userCartItem.upsert({
      where: {
        cartId_ticketTypeId: { cartId: cart.id, ticketTypeId: body.ticketTypeId },
      },
      create: {
        cartId: cart.id,
        eventId: body.eventId,
        ticketTypeId: body.ticketTypeId,
        occurrenceId: body.occurrenceId ?? ticketType.occurrenceId ?? null,
        quantity: body.quantity,
        unitPrice: ticketType.price,
      },
      update: {
        quantity: body.quantity,
        unitPrice: ticketType.price,
        occurrenceId: body.occurrenceId ?? ticketType.occurrenceId ?? null,
      },
    });

    return this.getCart(tenantId, userId);
  }

  async updateItem(
    tenantId: string,
    userId: string,
    itemId: string,
    body: PatchUserCartItemBody,
  ): Promise<MeCartResponse> {
    const cart = await this.prisma.userCart.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!cart) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Cart not found',
      });
    }

    const item = await this.prisma.userCartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { ticketType: true },
    });
    if (!item) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Cart item not found',
      });
    }

    if (body.quantity === 0) {
      await this.prisma.userCartItem.delete({ where: { id: itemId } });
      return this.getCart(tenantId, userId);
    }

    if (body.quantity > item.ticketType.maxPerOrder) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Max ${item.ticketType.maxPerOrder} per order`,
      });
    }

    await this.prisma.userCartItem.update({
      where: { id: itemId },
      data: { quantity: body.quantity },
    });
    return this.getCart(tenantId, userId);
  }

  async removeItem(tenantId: string, userId: string, itemId: string): Promise<MeCartResponse> {
    const cart = await this.prisma.userCart.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!cart) return this.getCart(tenantId, userId);

    await this.prisma.userCartItem.deleteMany({
      where: { id: itemId, cartId: cart.id },
    });
    return this.getCart(tenantId, userId);
  }

  async listPendingOrders(
    tenantId: string,
    userId: string,
  ): Promise<MePendingOrdersResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'User not found' });
    }

    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        status: 'PENDING_PAYMENT',
        OR: [{ buyerUserId: userId }, { buyerEmail: user.email }],
      },
      select: {
        id: true,
        eventId: true,
        status: true,
        buyerEmail: true,
        totalAmount: true,
        currency: true,
        createdAt: true,
        expiresAt: true,
        event: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      orders: orders.map((o) => ({
        id: o.id,
        eventId: o.eventId,
        status: o.status,
        buyerEmail: o.buyerEmail,
        totalAmount: o.totalAmount.toString(),
        currency: o.currency,
        createdAt: o.createdAt.toISOString(),
        eventTitle: o.event.title,
        expiresAt: o.expiresAt?.toISOString() ?? null,
      })),
    };
  }

  async checkout(
    tenantId: string,
    userId: string,
    body: MeCartCheckoutBody,
  ): Promise<MeCartCheckoutResponse> {
    if (body.tenantId !== tenantId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'tenantId mismatch',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!user) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'User not found' });
    }

    const cart = await this.prisma.userCart.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: { items: true },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Cart is empty',
      });
    }

    const byEventDate = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const key = `${item.eventId}:${item.occurrenceId ?? 'legacy'}`;
      const list = byEventDate.get(key) ?? [];
      list.push(item);
      byEventDate.set(key, list);
    }

    const orderIds: string[] = [];
    const checkoutUrls: string[] = [];
    for (const [, items] of byEventDate) {
      const eventId = items[0]!.eventId;
      const occurrenceId = items[0]!.occurrenceId ?? undefined;
      const order = await this.publicOrders.create(tenantId, {
        eventId,
        occurrenceId,
        buyer: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        items: items.map((i) => ({
          ticketTypeId: i.ticketTypeId,
          quantity: i.quantity,
        })),
        referralCode: body.referralCode,
        buyerUserId: userId,
      });
      orderIds.push(order.id);
      checkoutUrls.push(
        `/checkout/${encodeURIComponent(eventId)}?tenantId=${encodeURIComponent(tenantId)}&orderId=${encodeURIComponent(order.id)}`,
      );
    }

    await this.prisma.userCartItem.deleteMany({ where: { cartId: cart.id } });

    return {
      orderIds,
      checkoutUrls,
    };
  }
}
