import { Logger, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AdminDeepDeleteEntityType,
  AdminDeepDeleteImpactItem,
  AdminDeepDeletePreflight,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import {
  countUserDeleteDependencies,
  isProtectedMasterEmail,
  safeCount,
} from './admin-user-delete.util';
import { userDisplayLabel } from '../../common/user-contact.util';

const logger = new Logger('AdminDeepDeletePreflight');

const POLICY_BLOCKER_TYPES = new Set(['PROTECTED_MASTER', 'SELF_DELETE', 'LAST_ADMIN']);

function impact(
  type: string,
  label: string,
  count: number,
  severity: AdminDeepDeleteImpactItem['severity'],
  action: AdminDeepDeleteImpactItem['action'],
  extra?: Pick<AdminDeepDeleteImpactItem, 'adminPath' | 'description'>,
): AdminDeepDeleteImpactItem | null {
  if (count <= 0) return null;
  return { type, label, count, severity, action, ...extra };
}

export function finalizeDeepDeletePreflight(
  entityType: AdminDeepDeleteEntityType,
  entityId: string,
  entityLabel: string,
  impacts: AdminDeepDeleteImpactItem[],
): AdminDeepDeletePreflight {
  const blockerCount = impacts.filter((i) => i.severity === 'blocker').length;
  const criticalCount = impacts.filter((i) => i.severity === 'critical').length;
  const deleteCount = impacts
    .filter((i) => i.action === 'delete')
    .reduce((sum, i) => sum + i.count, 0);
  const softDeleteCount = impacts
    .filter((i) => i.action === 'soft_delete')
    .reduce((sum, i) => sum + i.count, 0);

  const hasPolicyBlocker = impacts.some(
    (i) => i.severity === 'blocker' && POLICY_BLOCKER_TYPES.has(i.type),
  );
  const requiresForce =
    !hasPolicyBlocker &&
    impacts.some((i) => i.severity === 'warning' || i.severity === 'critical');
  const requiresExtraConfirmation = criticalCount > 0;
  const canDelete = !hasPolicyBlocker;

  return {
    entityType,
    entityId,
    entityLabel,
    canDelete,
    requiresForce,
    requiresExtraConfirmation,
    summary: { deleteCount, softDeleteCount, criticalCount, blockerCount },
    impacts,
  };
}

async function buildUserPolicyBlockers(
  prisma: PrismaService,
  tenantId: string,
  user: { id: string; email: string | null; role: string },
  actorUserId: string,
): Promise<AdminDeepDeleteImpactItem[]> {
  const items: AdminDeepDeleteImpactItem[] = [];

  if (isProtectedMasterEmail(user.email)) {
    items.push({
      type: 'PROTECTED_MASTER',
      label: 'Cuenta maestro protegida',
      count: 1,
      severity: 'blocker',
      action: 'block',
      description: 'No se puede eliminar la cuenta maestro.',
    });
  }

  if (actorUserId && user.id === actorUserId) {
    items.push({
      type: 'SELF_DELETE',
      label: 'Auto-eliminación',
      count: 1,
      severity: 'blocker',
      action: 'block',
    });
  }

  if (user.role === Role.ADMIN) {
    const otherAdmins = await safeCount('lastAdmin', () =>
      prisma.user.count({
        where: {
          tenantId,
          role: Role.ADMIN,
          deletedAt: null,
          id: { not: user.id },
        },
      }),
    );
    if (otherAdmins === 0) {
      items.push({
        type: 'LAST_ADMIN',
        label: 'Último administrador',
        count: 1,
        severity: 'blocker',
        action: 'block',
      });
    }
  }

  return items;
}

function userCountsToImpacts(
  userId: string,
  counts: Awaited<ReturnType<typeof countUserDeleteDependencies>>,
): AdminDeepDeleteImpactItem[] {
  return [
    impact('EVENTS', 'Publicaciones asociadas', counts.events, 'warning', 'soft_delete', {
      adminPath: counts.primaryProducerProfileId
        ? `/admin/productoras/${counts.primaryProducerProfileId}`
        : '/admin/eventos',
    }),
    impact('GASTRO_DISCOUNTS', 'Descuentos gastronómicos', counts.gastroDiscounts, 'warning', 'soft_delete', {
      adminPath: counts.primaryGastroProfileId
        ? `/admin/gastronomicos/${counts.primaryGastroProfileId}`
        : '/admin/gastronomicos',
    }),
    impact('GASTRO_CONTENT', 'Contenido gastronómico', counts.gastroContent, 'info', 'delete'),
    impact('GASTRO_PUBLIC_EVENT', 'Publicación gastronómica', counts.gastroPublicEvents, 'warning', 'soft_delete'),
    impact('HOTEL_PUBLIC_EVENT', 'Publicación hotel', counts.hotelPublicEvents, 'warning', 'soft_delete'),
    impact('ORDERS', 'Órdenes de compra', counts.orders, 'critical', 'keep'),
    impact('TICKETS', 'Entradas emitidas', counts.tickets, 'critical', 'keep'),
    impact('PAYMENTS', 'Pagos asociados', counts.payments, 'critical', 'keep'),
    impact('REVIEWS', 'Reseñas públicas', counts.reviews, 'critical', 'keep'),
    impact('REVIEW_DISPUTES', 'Disputas de reseñas', counts.reviewDisputes, 'critical', 'keep'),
    impact('COMMERCIAL_REVIEWS', 'Reseñas comerciales', counts.commercialReviews, 'critical', 'keep'),
    impact('REFERRAL_COMMISSIONS', 'Comisiones de referido', counts.referralCommissions, 'critical', 'keep'),
    impact('REFERRER_AGREEMENTS', 'Acuerdos de referido', counts.referrerAgreements, 'warning', 'soft_delete'),
    impact('REFERRER_PROPOSALS', 'Propuestas comerciales', counts.referrerProposals, 'warning', 'soft_delete'),
    impact('REFERRER_PAYMENT_REQUESTS', 'Solicitudes de pago referido', counts.referrerPaymentRequests, 'critical', 'keep'),
    impact('REFERRER_EVENT_ASSIGNMENTS', 'Asignaciones en eventos', counts.referrerEventAssignments, 'warning', 'soft_delete'),
    impact('SCANNER_ACCOUNTS', 'Cuentas scanner', counts.scannerAccounts, 'warning', 'soft_delete'),
    impact('INBOX_ITEMS', 'Mensajes inbox creados', counts.inboxItems, 'critical', 'keep'),
    impact('AUDIT_LOG', 'Registros de auditoría (actor)', counts.auditLogActor, 'critical', 'keep'),
    impact('FAVORITES', 'Favoritos', counts.favorites, 'info', 'delete'),
    impact('EXPECTED_EVENTS', 'Eventos esperados', counts.expectedEvents, 'info', 'delete'),
    impact('CART_ITEMS', 'Ítems en carrito', counts.cartItems, 'info', 'delete'),
    impact('NOTIFICATIONS', 'Notificaciones', counts.notifications, 'info', 'delete'),
    impact('PUSH_SUBSCRIPTIONS', 'Suscripciones push', counts.pushSubscriptions, 'info', 'delete'),
    impact('GASTRO_DISCOUNT_CLAIMS', 'Cupones gastronómicos', counts.gastroDiscountClaims, 'info', 'delete'),
    impact('PRODUCER_FOLLOWS', 'Seguimientos de productoras', counts.producerFollows, 'info', 'delete'),
    impact('GASTRO_FOLLOWS', 'Seguimientos gastronómicos', counts.gastroFollows, 'info', 'delete'),
  ].filter((i): i is AdminDeepDeleteImpactItem => i != null);
}

export async function buildUserDeepDeletePreflight(
  prisma: PrismaService,
  tenantId: string,
  userId: string,
  actorUserId: string,
): Promise<AdminDeepDeletePreflight> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    select: { id: true, email: true, role: true, firstName: true, lastName: true },
  });
  if (!user) {
    throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'User not found' });
  }

  const label = userDisplayLabel(user);
  const [policy, counts] = await Promise.all([
    buildUserPolicyBlockers(prisma, tenantId, user, actorUserId),
    countUserDeleteDependencies(prisma, tenantId, userId),
  ]);

  return finalizeDeepDeletePreflight('USER', userId, label, [
    ...policy,
    ...userCountsToImpacts(userId, counts),
  ]);
}

export async function buildGastroDeepDeletePreflight(
  prisma: PrismaService,
  tenantId: string,
  profileId: string,
): Promise<AdminDeepDeletePreflight> {
  const profile = await prisma.gastroProfile.findFirst({
    where: { id: profileId, tenantId },
    select: { id: true, displayName: true, publicEventId: true },
  });
  if (!profile) {
    throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Gastro profile not found' });
  }

  const [
    discounts,
    content,
    followers,
    scanners,
    claimsActive,
    claimsUsed,
    validations,
    reviews,
  ] = await Promise.all([
    safeCount('gastroDiscounts', () =>
      prisma.gastroDiscount.count({ where: { gastroProfileId: profileId } }),
    ),
    safeCount('gastroContent', () =>
      prisma.gastroContent.count({ where: { gastroProfileId: profileId } }),
    ),
    safeCount('gastroFollowers', () =>
      prisma.userGastroFollow.count({ where: { gastroProfileId: profileId } }),
    ),
    safeCount('scanners', () =>
      prisma.scannerAccount.count({
        where: { tenantId, parentProfileType: 'GASTRO', parentProfileId: profileId },
      }),
    ),
    safeCount('claimsActive', () =>
      prisma.gastroDiscountClaim.count({
        where: { discount: { gastroProfileId: profileId }, status: 'ACTIVE' },
      }),
    ),
    safeCount('claimsUsed', () =>
      prisma.gastroDiscountClaim.count({
        where: { discount: { gastroProfileId: profileId }, status: 'USED' },
      }),
    ),
    safeCount('validations', () =>
      prisma.gastroDiscountValidation.count({
        where: { discount: { gastroProfileId: profileId } },
      }),
    ),
    profile.publicEventId
      ? safeCount('reviews', () =>
          prisma.review.count({ where: { tenantId, eventId: profile.publicEventId! } }),
        )
      : Promise.resolve(0),
  ]);

  const publicEvents = profile.publicEventId ? 1 : 0;

  return finalizeDeepDeletePreflight('GASTRO', profileId, profile.displayName, [
    impact('PUBLIC_EVENT', 'Publicación del local', publicEvents, 'warning', 'soft_delete', {
      adminPath: profile.publicEventId ? `/events/${profile.publicEventId}` : undefined,
    }),
    impact('GASTRO_DISCOUNTS', 'Descuentos', discounts, 'warning', 'soft_delete'),
    impact('GASTRO_DISCOUNT_CLAIMS', 'Cupones disponibles', claimsActive, 'info', 'delete'),
    impact('GASTRO_DISCOUNT_CLAIMS_USED', 'Cupones ya escaneados', claimsUsed, 'critical', 'keep', {
      description: 'Se conservan para auditoría.',
    }),
    impact('GASTRO_VALIDATIONS', 'Validaciones scanner', validations, 'critical', 'keep'),
    impact('GASTRO_CONTENT', 'Contenido editorial', content, 'info', 'delete'),
    impact('GASTRO_FOLLOWERS', 'Seguidores', followers, 'info', 'delete'),
    impact('SCANNER_ACCOUNTS', 'Cuentas scanner', scanners, 'warning', 'soft_delete'),
    impact('REVIEWS', 'Valoraciones', reviews, 'critical', 'keep'),
  ].filter((i): i is AdminDeepDeleteImpactItem => i != null));
}

export async function buildProducerDeepDeletePreflight(
  prisma: PrismaService,
  tenantId: string,
  profileId: string,
): Promise<AdminDeepDeletePreflight> {
  const profile = await prisma.producerProfile.findFirst({
    where: { id: profileId, tenantId },
    select: { id: true, displayName: true },
  });
  if (!profile) {
    throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Producer profile not found' });
  }

  const events = await safeCount('events', () =>
    prisma.event.count({ where: { tenantId, producerProfileId: profileId, deletedAt: null } }),
  );

  const eventIds = await prisma.event.findMany({
    where: { tenantId, producerProfileId: profileId, deletedAt: null },
    select: { id: true },
  });
  const ids = eventIds.map((e) => e.id);

  const [orders, tickets, payments, reviews, scanners, memberships] = await Promise.all([
    ids.length
      ? safeCount('orders', () => prisma.order.count({ where: { tenantId, eventId: { in: ids } } }))
      : Promise.resolve(0),
    ids.length
      ? safeCount('tickets', () => prisma.ticket.count({ where: { eventId: { in: ids } } }))
      : Promise.resolve(0),
    ids.length
      ? safeCount('payments', () =>
          prisma.payment.count({ where: { order: { tenantId, eventId: { in: ids } } } }),
        )
      : Promise.resolve(0),
    ids.length
      ? safeCount('reviews', () =>
          prisma.review.count({ where: { tenantId, eventId: { in: ids } } }),
        )
      : Promise.resolve(0),
    safeCount('scanners', () =>
      prisma.scannerAccount.count({
        where: { tenantId, parentProfileType: 'PRODUCER', parentProfileId: profileId },
      }),
    ),
    safeCount('memberships', () =>
      prisma.userProducerMembership.count({ where: { profileId } }),
    ),
  ]);

  return finalizeDeepDeletePreflight('PRODUCER', profileId, profile.displayName, [
    impact('EVENTS', 'Eventos / publicaciones', events, 'warning', 'soft_delete', {
      adminPath: `/admin/productoras/${profileId}`,
    }),
    impact('ORDERS', 'Órdenes', orders, 'critical', 'keep'),
    impact('TICKETS', 'Entradas', tickets, 'critical', 'keep'),
    impact('PAYMENTS', 'Pagos', payments, 'critical', 'keep'),
    impact('REVIEWS', 'Valoraciones', reviews, 'critical', 'keep'),
    impact('SCANNER_ACCOUNTS', 'Cuentas scanner', scanners, 'warning', 'soft_delete'),
    impact('MEMBERSHIPS', 'Miembros del equipo', memberships, 'info', 'delete'),
  ].filter((i): i is AdminDeepDeleteImpactItem => i != null));
}

export async function buildHotelDeepDeletePreflight(
  prisma: PrismaService,
  tenantId: string,
  profileId: string,
): Promise<AdminDeepDeletePreflight> {
  const profile = await prisma.hotelProfile.findFirst({
    where: { id: profileId, tenantId },
    select: { id: true, displayName: true, publicEventId: true },
  });
  if (!profile) {
    throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Hotel profile not found' });
  }

  const [memberships, reviews] = await Promise.all([
    safeCount('memberships', () =>
      prisma.userHotelMembership.count({ where: { profileId } }),
    ),
    profile.publicEventId
      ? safeCount('reviews', () =>
          prisma.review.count({ where: { tenantId, eventId: profile.publicEventId! } }),
        )
      : Promise.resolve(0),
  ]);

  const publicEvents = profile.publicEventId ? 1 : 0;

  return finalizeDeepDeletePreflight('HOTEL', profileId, profile.displayName, [
    impact('PUBLIC_EVENT', 'Publicación del hotel', publicEvents, 'warning', 'soft_delete'),
    impact('MEMBERSHIPS', 'Miembros del equipo', memberships, 'info', 'delete'),
    impact('REVIEWS', 'Valoraciones', reviews, 'critical', 'keep'),
  ].filter((i): i is AdminDeepDeleteImpactItem => i != null));
}

export async function buildEventDeepDeletePreflight(
  prisma: PrismaService,
  tenantId: string,
  eventId: string,
): Promise<AdminDeepDeletePreflight> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId, deletedAt: null },
    select: { id: true, title: true, producerProfileId: true },
  });
  if (!event) {
    throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
  }

  const [orders, tickets, payments, reviews, scans, discounts, scanners] = await Promise.all([
    safeCount('orders', () => prisma.order.count({ where: { tenantId, eventId } })),
    safeCount('tickets', () => prisma.ticket.count({ where: { eventId } })),
    safeCount('payments', () =>
      prisma.payment.count({ where: { order: { tenantId, eventId } } }),
    ),
    safeCount('reviews', () => prisma.review.count({ where: { tenantId, eventId } })),
    safeCount('scans', () => prisma.ticketScan.count({ where: { tenantId, eventId } })),
    safeCount('gastroDiscounts', () =>
      prisma.gastroDiscount.count({ where: { eventId } }),
    ),
    event.producerProfileId
      ? safeCount('scanners', () =>
          prisma.scannerAccount.count({
            where: {
              tenantId,
              parentProfileType: 'PRODUCER',
              parentProfileId: event.producerProfileId!,
            },
          }),
        )
      : Promise.resolve(0),
  ]);

  return finalizeDeepDeletePreflight('EVENT', eventId, event.title ?? eventId, [
    impact('ORDERS', 'Órdenes', orders, 'critical', 'keep'),
    impact('TICKETS', 'Entradas', tickets, 'critical', 'keep'),
    impact('PAYMENTS', 'Pagos', payments, 'critical', 'keep'),
    impact('REVIEWS', 'Valoraciones', reviews, 'critical', 'keep'),
    impact('TICKET_SCANS', 'Escaneos', scans, 'critical', 'keep'),
    impact('GASTRO_DISCOUNTS', 'Descuentos asociados', discounts, 'warning', 'soft_delete'),
    impact('SCANNER_ACCOUNTS', 'Cuentas scanner (productora)', scanners, 'warning', 'soft_delete'),
    impact('EVENT', 'Publicación', 1, 'warning', 'soft_delete'),
  ].filter((i): i is AdminDeepDeleteImpactItem => i != null));
}

export async function buildRentalLocationDeepDeletePreflight(
  prisma: PrismaService,
  tenantId: string,
  locationId: string,
): Promise<AdminDeepDeletePreflight> {
  const location = await prisma.rentalLocation.findFirst({
    where: { id: locationId, tenantId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!location) {
    throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Rental location not found' });
  }

  const products = await prisma.event.findMany({
    where: { rentalLocationId: locationId, tenantId, deletedAt: null },
    select: { id: true },
  });
  const ids = products.map((p) => p.id);

  const [orders, tickets, payments, reviews] = await Promise.all([
    ids.length
      ? safeCount('orders', () => prisma.order.count({ where: { tenantId, eventId: { in: ids } } }))
      : Promise.resolve(0),
    ids.length
      ? safeCount('tickets', () => prisma.ticket.count({ where: { eventId: { in: ids } } }))
      : Promise.resolve(0),
    ids.length
      ? safeCount('payments', () =>
          prisma.payment.count({ where: { order: { tenantId, eventId: { in: ids } } } }),
        )
      : Promise.resolve(0),
    ids.length
      ? safeCount('reviews', () =>
          prisma.review.count({ where: { tenantId, eventId: { in: ids } } }),
        )
      : Promise.resolve(0),
  ]);

  return finalizeDeepDeletePreflight('RENTAL_LOCATION', locationId, location.name, [
    impact('PRODUCTS', 'Productos / publicaciones', products.length, 'warning', 'soft_delete', {
      adminPath: `/admin/rentals/locales/${locationId}`,
    }),
    impact('ORDERS', 'Órdenes', orders, 'critical', 'keep'),
    impact('TICKETS', 'Entradas', tickets, 'critical', 'keep'),
    impact('PAYMENTS', 'Pagos', payments, 'critical', 'keep'),
    impact('REVIEWS', 'Valoraciones', reviews, 'critical', 'keep'),
    impact('RENTAL_LOCATION', 'Local de alquiler', 1, 'warning', 'soft_delete'),
  ].filter((i): i is AdminDeepDeleteImpactItem => i != null));
}

export async function buildExcursionOperatorDeepDeletePreflight(
  prisma: PrismaService,
  tenantId: string,
  operatorId: string,
): Promise<AdminDeepDeletePreflight> {
  const operator = await prisma.excursionOperator.findFirst({
    where: { id: operatorId, tenantId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!operator) {
    throw new NotFoundException({
      code: ErrorCode.NOT_FOUND,
      message: 'Excursion operator not found',
    });
  }

  const excursions = await prisma.event.findMany({
    where: { excursionOperatorId: operatorId, tenantId, deletedAt: null },
    select: { id: true },
  });
  const ids = excursions.map((e) => e.id);

  const [orders, tickets, payments, reviews] = await Promise.all([
    ids.length
      ? safeCount('orders', () => prisma.order.count({ where: { tenantId, eventId: { in: ids } } }))
      : Promise.resolve(0),
    ids.length
      ? safeCount('tickets', () => prisma.ticket.count({ where: { eventId: { in: ids } } }))
      : Promise.resolve(0),
    ids.length
      ? safeCount('payments', () =>
          prisma.payment.count({ where: { order: { tenantId, eventId: { in: ids } } } }),
        )
      : Promise.resolve(0),
    ids.length
      ? safeCount('reviews', () =>
          prisma.review.count({ where: { tenantId, eventId: { in: ids } } }),
        )
      : Promise.resolve(0),
  ]);

  return finalizeDeepDeletePreflight('EXCURSION_OPERATOR', operatorId, operator.name, [
    impact('EXCURSIONS', 'Excursiones / publicaciones', excursions.length, 'warning', 'soft_delete', {
      adminPath: `/admin/excursiones/operadores/${operatorId}`,
    }),
    impact('ORDERS', 'Órdenes', orders, 'critical', 'keep'),
    impact('TICKETS', 'Entradas', tickets, 'critical', 'keep'),
    impact('PAYMENTS', 'Pagos', payments, 'critical', 'keep'),
    impact('REVIEWS', 'Valoraciones', reviews, 'critical', 'keep'),
    impact('EXCURSION_OPERATOR', 'Operador de excursiones', 1, 'warning', 'soft_delete'),
  ].filter((i): i is AdminDeepDeleteImpactItem => i != null));
}

export async function buildDeepDeletePreflight(
  prisma: PrismaService,
  tenantId: string,
  entityType: AdminDeepDeleteEntityType,
  entityId: string,
  actorUserId: string,
): Promise<AdminDeepDeletePreflight> {
  try {
    switch (entityType) {
      case 'USER':
        return buildUserDeepDeletePreflight(prisma, tenantId, entityId, actorUserId);
      case 'GASTRO':
        return buildGastroDeepDeletePreflight(prisma, tenantId, entityId);
      case 'PRODUCER':
        return buildProducerDeepDeletePreflight(prisma, tenantId, entityId);
      case 'HOTEL':
        return buildHotelDeepDeletePreflight(prisma, tenantId, entityId);
      case 'EVENT':
        return buildEventDeepDeletePreflight(prisma, tenantId, entityId);
      case 'RENTAL_LOCATION':
        return buildRentalLocationDeepDeletePreflight(prisma, tenantId, entityId);
      case 'EXCURSION_OPERATOR':
        return buildExcursionOperatorDeepDeletePreflight(prisma, tenantId, entityId);
      default:
        throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Unknown entity type' });
    }
  } catch (error) {
    if (error instanceof NotFoundException) throw error;
    logger.error(
      `Deep delete preflight failed entityType=${entityType} entityId=${entityId}`,
      error instanceof Error ? error.stack : String(error),
    );
    throw error;
  }
}
