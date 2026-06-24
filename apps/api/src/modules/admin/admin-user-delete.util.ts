import type { PrismaService } from '../../prisma/prisma.service';
import type { AdminUserDeletePreflight } from '@yo-te-invito/shared';

export type AdminUserDeleteBlocker = AdminUserDeletePreflight['blockers'][number];
export type AdminUserDeleteWarning = AdminUserDeletePreflight['warnings'][number];

export type UserDeleteDependencyCounts = {
  events: number;
  gastroDiscounts: number;
  gastroContent: number;
  gastroPublicEvents: number;
  hotelPublicEvents: number;
  referrerAgreements: number;
  referrerProposals: number;
  referrerPaymentRequests: number;
  referrerEventAssignments: number;
  orders: number;
  tickets: number;
  payments: number;
  reviews: number;
  reviewDisputes: number;
  commercialReviews: number;
  referralCommissions: number;
  courtesyGrants: number;
  gastroCourtesyCampaigns: number;
  scannerAccounts: number;
  inboxItems: number;
  ticketDateChanges: number;
  ticketTransferOffers: number;
  auditLogActor: number;
  favorites: number;
  expectedEvents: number;
  cartItems: number;
  notifications: number;
  pushSubscriptions: number;
  gastroDiscountClaims: number;
  producerFollows: number;
  gastroFollows: number;
  primaryProducerProfileId: string | null;
  primaryGastroProfileId: string | null;
};

export async function countUserDeleteDependencies(
  prisma: PrismaService,
  tenantId: string,
  userId: string,
): Promise<UserDeleteDependencyCounts> {
  const [
    producerMemberships,
    gastroMemberships,
    hotelMemberships,
    referrerMemberships,
  ] = await Promise.all([
    prisma.userProducerMembership.findMany({
      where: { tenantId, userId },
      select: { profileId: true },
    }),
    prisma.userGastroMembership.findMany({
      where: { tenantId, userId },
      select: { profileId: true },
    }),
    prisma.userHotelMembership.findMany({
      where: { tenantId, userId },
      select: { profileId: true },
    }),
    prisma.userReferrerMembership.findMany({
      where: { tenantId, userId },
      select: { profileId: true },
    }),
  ]);

  const producerProfileIds = producerMemberships.map((m) => m.profileId);
  const gastroProfileIds = gastroMemberships.map((m) => m.profileId);
  const hotelProfileIds = hotelMemberships.map((m) => m.profileId);
  const referrerProfileIds = referrerMemberships.map((m) => m.profileId);

  const eventWhere = {
    tenantId,
    deletedAt: null as Date | null,
    OR: [
      { producerId: userId },
      ...(producerProfileIds.length > 0
        ? [{ producerProfileId: { in: producerProfileIds } }]
        : []),
    ],
  };

  const orderIds = (
    await prisma.order.findMany({
      where: { tenantId, buyerUserId: userId },
      select: { id: true },
    })
  ).map((o) => o.id);

  const [
    events,
    gastroDiscounts,
    gastroContent,
    gastroPublicEvents,
    hotelPublicEvents,
    referrerAgreements,
    referrerProposals,
    referrerPaymentRequests,
    referrerEventAssignments,
    orders,
    tickets,
    payments,
    reviews,
    reviewDisputes,
    commercialReviews,
    referralCommissions,
    courtesyGrants,
    gastroCourtesyCampaigns,
    scannerAsScanner,
    scannerAsParent,
    inboxItems,
    ticketDateChanges,
    ticketTransferOffers,
    auditLogActor,
    favorites,
    expectedEvents,
    cartItems,
    notifications,
    pushSubscriptions,
    gastroDiscountClaims,
    producerFollows,
    gastroFollows,
  ] = await Promise.all([
    prisma.event.count({ where: eventWhere }),
    gastroProfileIds.length > 0
      ? prisma.gastroDiscount.count({
          where: { tenantId, gastroProfileId: { in: gastroProfileIds } },
        })
      : Promise.resolve(0),
    gastroProfileIds.length > 0
      ? prisma.gastroContent.count({
          where: { tenantId, gastroProfileId: { in: gastroProfileIds } },
        })
      : Promise.resolve(0),
    gastroProfileIds.length > 0
      ? prisma.gastroProfile.count({
          where: {
            tenantId,
            id: { in: gastroProfileIds },
            publicEventId: { not: null },
          },
        })
      : Promise.resolve(0),
    hotelProfileIds.length > 0
      ? prisma.hotelProfile.count({
          where: {
            tenantId,
            id: { in: hotelProfileIds },
            publicEventId: { not: null },
          },
        })
      : Promise.resolve(0),
    referrerProfileIds.length > 0
      ? prisma.referralCommercialAgreement.count({
          where: { tenantId, referrerProfileId: { in: referrerProfileIds } },
        })
      : Promise.resolve(0),
    referrerProfileIds.length > 0
      ? prisma.referralCommercialProposal.count({
          where: { tenantId, referrerProfileId: { in: referrerProfileIds } },
        })
      : Promise.resolve(0),
    referrerProfileIds.length > 0
      ? prisma.referralPaymentRequest.count({
          where: { tenantId, referrerProfileId: { in: referrerProfileIds } },
        })
      : Promise.resolve(0),
    referrerProfileIds.length > 0
      ? prisma.eventReferrerAssignment.count({
          where: { referrerProfileId: { in: referrerProfileIds } },
        })
      : Promise.resolve(0),
    prisma.order.count({ where: { tenantId, buyerUserId: userId } }),
    prisma.ticket.count({ where: { ownerUserId: userId } }),
    orderIds.length > 0
      ? prisma.payment.count({ where: { orderId: { in: orderIds } } })
      : Promise.resolve(0),
    prisma.review.count({ where: { tenantId, userId } }),
    prisma.reviewDisputeRequest.count({ where: { tenantId, requestedByUserId: userId } }),
    prisma.commercialRelationshipReview.count({ where: { tenantId, reviewerUserId: userId } }),
    prisma.referralCommission.count({ where: { tenantId, referrerId: userId } }),
    prisma.courtesyGrant.count({ where: { tenantId, createdById: userId } }),
    prisma.gastroCourtesyCampaign.count({ where: { tenantId, createdByUserId: userId } }),
    prisma.scannerAccount.count({ where: { tenantId, scannerUserId: userId } }),
    prisma.scannerAccount.count({ where: { tenantId, parentUserId: userId } }),
    prisma.inboxItem.count({ where: { tenantId, createdByUserId: userId } }),
    prisma.ticketDateChangeRequest.count({ where: { tenantId, requestedByUserId: userId } }),
    prisma.ticketTransferOffer.count({
      where: {
        tenantId,
        OR: [{ sellerUserId: userId }, { buyerUserId: userId }],
      },
    }),
    prisma.auditLog.count({ where: { tenantId, actorId: userId } }),
    prisma.userFavorite.count({ where: { tenantId, userId } }),
    prisma.userExpectedEvent.count({ where: { tenantId, userId } }),
    prisma.userCartItem.count({ where: { cart: { tenantId, userId } } }),
    prisma.userNotification.count({ where: { tenantId, userId } }),
    prisma.userPushSubscription.count({ where: { tenantId, userId } }),
    prisma.gastroDiscountClaim.count({ where: { tenantId, userId } }),
    prisma.userProducerFollow.count({ where: { tenantId, userId } }),
    prisma.userGastroFollow.count({ where: { tenantId, userId } }),
  ]);

  return {
    events,
    gastroDiscounts,
    gastroContent,
    gastroPublicEvents,
    hotelPublicEvents,
    referrerAgreements,
    referrerProposals,
    referrerPaymentRequests,
    referrerEventAssignments,
    orders,
    tickets,
    payments,
    reviews,
    reviewDisputes,
    commercialReviews,
    referralCommissions,
    courtesyGrants,
    gastroCourtesyCampaigns,
    scannerAccounts: scannerAsScanner + scannerAsParent,
    inboxItems,
    ticketDateChanges,
    ticketTransferOffers,
    auditLogActor,
    favorites,
    expectedEvents,
    cartItems,
    notifications,
    pushSubscriptions,
    gastroDiscountClaims,
    producerFollows,
    gastroFollows,
    primaryProducerProfileId: producerProfileIds[0] ?? null,
    primaryGastroProfileId: gastroProfileIds[0] ?? null,
  };
}

function blocker(
  type: string,
  count: number,
  message: string,
  adminPath?: string,
): AdminUserDeleteBlocker | null {
  if (count <= 0) return null;
  return { type, count, message, ...(adminPath ? { adminPath } : {}) };
}

function warning(type: string, count: number, message: string): AdminUserDeleteWarning | null {
  if (count <= 0) return null;
  return { type, count, message };
}

export function buildAdminUserDeletePreflight(
  counts: UserDeleteDependencyCounts,
  userId: string,
  policyBlockers: AdminUserDeleteBlocker[] = [],
): AdminUserDeletePreflight {
  const eventsAdminPath = counts.primaryProducerProfileId
    ? `/admin/eventos?producerProfileId=${counts.primaryProducerProfileId}`
    : `/admin/eventos?q=${encodeURIComponent(userId)}`;

  const blockers = [
    ...policyBlockers,
    blocker(
      'EVENTS',
      counts.events,
      'El usuario tiene publicaciones asociadas. Primero eliminá o archivá sus publicaciones.',
      eventsAdminPath,
    ),
    blocker(
      'GASTRO_DISCOUNTS',
      counts.gastroDiscounts,
      'Perfil gastronómico con descuentos activos o históricos.',
      counts.primaryGastroProfileId
        ? `/admin/gastronomicos/${counts.primaryGastroProfileId}`
        : '/admin/gastronomicos',
    ),
    blocker(
      'GASTRO_CONTENT',
      counts.gastroContent,
      'Perfil gastronómico con contenido editorial.',
      '/admin/gastronomicos',
    ),
    blocker(
      'GASTRO_PUBLIC_EVENT',
      counts.gastroPublicEvents,
      'Local gastronómico con publicación pública vinculada.',
      '/admin/gastronomicos',
    ),
    blocker(
      'HOTEL_PUBLIC_EVENT',
      counts.hotelPublicEvents,
      'Perfil hotel con publicación pública vinculada.',
      '/admin/hoteles',
    ),
    blocker(
      'REFERRER_AGREEMENTS',
      counts.referrerAgreements,
      'Perfil referido con acuerdos comerciales.',
      '/admin/referidos',
    ),
    blocker(
      'REFERRER_PROPOSALS',
      counts.referrerProposals,
      'Perfil referido con propuestas comerciales.',
      '/admin/referidos',
    ),
    blocker(
      'REFERRER_PAYMENT_REQUESTS',
      counts.referrerPaymentRequests,
      'Perfil referido con solicitudes de pago.',
      '/admin/referidos',
    ),
    blocker(
      'REFERRER_EVENT_ASSIGNMENTS',
      counts.referrerEventAssignments,
      'Perfil referido asignado a eventos.',
      '/admin/referidos',
    ),
    blocker('ORDERS', counts.orders, 'El usuario tiene órdenes de compra.', '/admin/pagos'),
    blocker('TICKETS', counts.tickets, 'El usuario tiene entradas emitidas.', '/admin/tickets'),
    blocker('PAYMENTS', counts.payments, 'El usuario tiene pagos asociados.', '/admin/pagos'),
    blocker('REVIEWS', counts.reviews, 'El usuario tiene reseñas públicas.', '/admin/resenas'),
    blocker(
      'REVIEW_DISPUTES',
      counts.reviewDisputes,
      'El usuario tiene disputas de reseñas.',
      '/admin/disputas-resenas',
    ),
    blocker(
      'COMMERCIAL_REVIEWS',
      counts.commercialReviews,
      'El usuario tiene reseñas comerciales B2B.',
    ),
    blocker(
      'REFERRAL_COMMISSIONS',
      counts.referralCommissions,
      'El usuario tiene comisiones de referido.',
      '/admin/referidos',
    ),
    blocker('COURTESY_GRANTS', counts.courtesyGrants, 'El usuario emitió cortesías.'),
    blocker(
      'GASTRO_COURTESY_CAMPAIGNS',
      counts.gastroCourtesyCampaigns,
      'El usuario creó campañas de cortesía gastronómica.',
    ),
    blocker(
      'SCANNER_ACCOUNTS',
      counts.scannerAccounts,
      'El usuario tiene cuentas scanner vinculadas.',
      '/admin/scanner',
    ),
    blocker('INBOX_ITEMS', counts.inboxItems, 'El usuario creó ítems en la bandeja admin.'),
    blocker(
      'TICKET_DATE_CHANGES',
      counts.ticketDateChanges,
      'El usuario tiene solicitudes de cambio de fecha de entrada.',
    ),
    blocker(
      'TICKET_TRANSFERS',
      counts.ticketTransferOffers,
      'El usuario tiene transferencias de entradas.',
    ),
    blocker(
      'AUDIT_LOG_ACTOR',
      counts.auditLogActor,
      'El usuario tiene historial de auditoría como actor.',
      '/admin/auditoria',
    ),
  ].filter((b): b is AdminUserDeleteBlocker => b != null);

  const warnings = [
    warning('FAVORITES', counts.favorites, 'Favoritos del usuario (se eliminarán).'),
    warning(
      'EXPECTED_EVENTS',
      counts.expectedEvents,
      'Eventos esperados / recordatorios (se eliminarán).',
    ),
    warning('CART', counts.cartItems, 'Ítems en carrito (se eliminarán).'),
    warning('NOTIFICATIONS', counts.notifications, 'Notificaciones privadas (se eliminarán).'),
    warning(
      'PUSH_SUBSCRIPTIONS',
      counts.pushSubscriptions,
      'Suscripciones push (se eliminarán).',
    ),
    warning(
      'GASTRO_DISCOUNT_CLAIMS',
      counts.gastroDiscountClaims,
      'Reclamos de descuentos gastronómicos (se eliminarán).',
    ),
    warning(
      'FOLLOWS',
      counts.producerFollows + counts.gastroFollows,
      'Seguimientos a perfiles (se eliminarán).',
    ),
  ].filter((w): w is AdminUserDeleteWarning => w != null);

  return {
    canDelete: blockers.length === 0,
    blockers,
    warnings,
  };
}
