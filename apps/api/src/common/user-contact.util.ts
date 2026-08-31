import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ErrorCode } from '@yo-te-invito/shared';

export type UserContactFields = {
  id?: string;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

/** Primary contact string for display (never fabricates an email). */
export function userDisplayLabel(user: UserContactFields): string {
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  const username = user.username?.trim();
  if (username) return username;
  return user.id ?? '—';
}

export function userPrimaryContact(user: UserContactFields): string | null {
  const email = user.email?.trim();
  if (email) return email;
  const username = user.username?.trim();
  if (username) return username;
  return null;
}

export function requireUserEmail(
  user: { email: string | null },
  message = 'Se requiere un email verificado para esta operación',
): string {
  const email = user.email?.trim();
  if (!email) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message,
    });
  }
  return email;
}

/** Ticket ownership: owner user id OR guest purchase matched by buyer email. */
export function ticketOwnershipOrClauses(
  userId: string,
  email: string | null | undefined,
  tenantId: string,
): Prisma.TicketWhereInput[] {
  const clauses: Prisma.TicketWhereInput[] = [{ ownerUserId: userId }];
  const normalized = email?.trim();
  if (normalized) {
    clauses.push({
      ownerUserId: null,
      status: { not: 'TRANSFERRED' },
      order: {
        tenantId,
        status: 'PAID',
        buyerEmail: { equals: normalized, mode: 'insensitive' },
      },
    });
  }
  return clauses;
}

export function orderOwnershipOrClauses(
  userId: string,
  email: string | null | undefined,
): Prisma.OrderWhereInput[] {
  const clauses: Prisma.OrderWhereInput[] = [{ buyerUserId: userId }];
  const normalized = email?.trim();
  if (normalized) {
    clauses.push({ buyerEmail: { equals: normalized, mode: 'insensitive' } });
  }
  return clauses;
}

export function ticketBuyerDisplayName(input: {
  order?: { buyerFirstName: string; buyerLastName: string; buyerEmail: string } | null;
  ownerUser?: UserContactFields | null;
}): string {
  if (input.order) {
    const name = `${input.order.buyerFirstName} ${input.order.buyerLastName}`.trim();
    if (name) return name;
    return input.order.buyerEmail;
  }
  if (input.ownerUser) {
    return userDisplayLabel(input.ownerUser);
  }
  return '—';
}

export function ticketBuyerEmail(input: {
  order?: { buyerEmail: string } | null;
  ownerUser?: { email?: string | null } | null;
}): string | null {
  return input.order?.buyerEmail ?? input.ownerUser?.email?.trim() ?? null;
}
