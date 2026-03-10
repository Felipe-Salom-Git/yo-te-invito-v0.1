/**
 * LocalDB seed — populates demo data for development.
 * 1 tenant, 5 users (ADMIN, PRODUCER, GASTRO, REFERRER, USER),
 * 10 events, ticketTypes per event, orders + tickets owned by USER.
 */

import type { LocalDB } from './LocalDB';

const TENANT_ID = 'tenant-demo';
const USER_IDS = {
  ADMIN: 'user-admin',
  PRODUCER: 'user-producer',
  GASTRO: 'user-gastro',
  REFERRER: 'user-referrer',
  USER: 'user-buyer',
  SCANNER: 'user-scanner',
} as const;

function eventId(i: number) {
  return `event-${String(i).padStart(2, '0')}`;
}

function ticketTypeId(eventId: string, i: number) {
  return `${eventId}-tt-${i}`;
}

/** Populate localStorage with demo data. */
export function seedLocalDB(db: LocalDB): void {
  // 1 tenant
  db.create('tenants', {
    id: TENANT_ID,
    name: 'Demo Tenant',
    isActive: true,
    createdAt: new Date().toISOString(),
  });

  // 5 users
  const users: Array<{ id: string; tenantId: string; email: string; role: string; firstName: string; lastName: string }> = [
    { id: USER_IDS.ADMIN, tenantId: TENANT_ID, email: 'admin@demo.local', role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
    { id: USER_IDS.PRODUCER, tenantId: TENANT_ID, email: 'producer@demo.local', role: 'PRODUCER_OWNER', firstName: 'Producer', lastName: 'User' },
    { id: USER_IDS.GASTRO, tenantId: TENANT_ID, email: 'gastro@demo.local', role: 'GASTRO_OWNER', firstName: 'Gastro', lastName: 'User' },
    { id: USER_IDS.REFERRER, tenantId: TENANT_ID, email: 'referrer@demo.local', role: 'REFERRER', firstName: 'Referrer', lastName: 'User' },
    { id: USER_IDS.USER, tenantId: TENANT_ID, email: 'user@demo.local', role: 'USER', firstName: 'Buyer', lastName: 'User' },
    { id: USER_IDS.SCANNER, tenantId: TENANT_ID, email: 'scanner@demo.local', role: 'SCANNER', firstName: 'Scanner', lastName: 'Operator' },
  ];
  users.forEach((u) => db.create('users', u));

  const PRODUCER_ID = 'producer-demo';
  db.create('producers', {
    id: PRODUCER_ID,
    tenantId: TENANT_ID,
    displayName: 'Demo Producer',
    slug: 'demo-producer',
    ratingAvg: 4.5,
    ratingCount: 12,
  });

  const now = new Date();
  const events: Array<{
    id: string;
    tenantId: string;
    producerId?: string;
    category?: string;
    title: string;
    startAt: string;
    endAt: string | null;
    city: string | null;
    venueName: string | null;
    coverImageUrl: string | null;
    description: string | null;
    venueAddress: string | null;
    geoLat: number | null;
    geoLng: number | null;
    capacityTotal: number | null;
    isTicketingEnabled: boolean;
    status: string;
    media: Array<{ id: string; type: string; url: string; sortOrder: number }>;
  }> = [
    {
      id: eventId(1),
      tenantId: TENANT_ID,
      producerId: PRODUCER_ID,
      title: 'Concierto en Vivo 2025',
      category: 'event',
      startAt: addDays(now, 7).toISOString(),
      endAt: addDays(now, 7, 3).toISOString(),
      city: 'Buenos Aires',
      venueName: 'Teatro Gran Rex',
      coverImageUrl: 'https://images.pexels.com/photos/2102568/pexels-photo-2102568.jpeg',
      description: 'Noche de música en vivo en el corazón de la ciudad.',
      venueAddress: 'Av. Corrientes 857',
      geoLat: -34.6,
      geoLng: -58.38,
      capacityTotal: 3000,
      isTicketingEnabled: true,
      status: 'approved',
      media: [],
    },
    {
      id: eventId(2),
      tenantId: TENANT_ID,
      producerId: PRODUCER_ID,
      title: 'Festival de Tango',
      category: 'event',
      startAt: addDays(now, 14).toISOString(),
      endAt: null,
      city: 'Buenos Aires',
      venueName: 'La Boca',
      coverImageUrl: 'https://images.pexels.com/photos/2105802/pexels-photo-2105802.jpeg',
      description: 'Festival de tango tradicional con orquestas en vivo.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: 500,
      isTicketingEnabled: true,
      status: 'approved',
      media: [],
    },
    {
      id: eventId(3),
      tenantId: TENANT_ID,
      producerId: PRODUCER_ID,
      title: 'Workshop de Cine',
      category: 'event',
      startAt: addDays(now, 21).toISOString(),
      endAt: null,
      city: 'Córdoba',
      venueName: 'Cinemateca',
      coverImageUrl: 'https://images.pexels.com/photos/799115/pexels-photo-799115.jpeg',
      description: 'Taller intensivo de realización audiovisual.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: 50,
      isTicketingEnabled: true,
      status: 'approved',
      media: [],
    },
    {
      id: eventId(4),
      tenantId: TENANT_ID,
      title: 'Show de Stand-up',
      category: 'event',
      startAt: addDays(now, 30).toISOString(),
      endAt: null,
      city: 'Buenos Aires',
      venueName: 'Teatro Broadway',
      coverImageUrl: 'https://images.pexels.com/photos/799091/pexels-photo-799091.jpeg',
      description: 'Noche de comedia en vivo con varios comediantes.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: 400,
      isTicketingEnabled: true,
      status: 'approved',
      media: [],
    },
    {
      id: eventId(5),
      tenantId: TENANT_ID,
      title: 'Feria de Arte Urbano',
      category: 'event',
      startAt: addDays(now, 45).toISOString(),
      endAt: null,
      city: 'Mendoza',
      venueName: 'Plaza Independencia',
      coverImageUrl: 'https://images.pexels.com/photos/409127/pexels-photo-409127.jpeg',
      description: 'Exposición de artistas callejeros y muralistas.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: null,
      isTicketingEnabled: false,
      status: 'approved',
      media: [],
    },
    {
      id: eventId(6),
      tenantId: TENANT_ID,
      title: 'Concierto Pasado',
      category: 'event',
      startAt: addDays(now, -30).toISOString(),
      endAt: null,
      city: 'Buenos Aires',
      venueName: 'Estadio',
      coverImageUrl: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg',
      description: 'Gran concierto ya realizado.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: 10000,
      isTicketingEnabled: true,
      status: 'approved',
      media: [],
    },
    {
      id: eventId(7),
      tenantId: TENANT_ID,
      title: 'Maratón 2024',
      category: 'event',
      startAt: addDays(now, -60).toISOString(),
      endAt: null,
      city: 'Buenos Aires',
      venueName: 'Parque 3 de Febrero',
      coverImageUrl: 'https://images.pexels.com/photos/2402777/pexels-photo-2402777.jpeg',
      description: 'Maratón anual de la ciudad.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: 5000,
      isTicketingEnabled: true,
      status: 'approved',
      media: [],
    },
    {
      id: eventId(8),
      tenantId: TENANT_ID,
      title: 'Expo Tech 2024',
      category: 'event',
      startAt: addDays(now, -90).toISOString(),
      endAt: null,
      city: 'Buenos Aires',
      venueName: 'Costa Salguero',
      coverImageUrl: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg',
      description: 'Exposición de tecnología e innovación.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: 8000,
      isTicketingEnabled: true,
      status: 'approved',
      media: [],
    },
    {
      id: eventId(9),
      tenantId: TENANT_ID,
      title: 'Cena Gourmet',
      category: 'gastro',
      startAt: addDays(now, 3).toISOString(),
      endAt: null,
      city: 'Buenos Aires',
      venueName: 'Restaurant Palermo',
      coverImageUrl: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg',
      description: 'Experiencia gastronómica de varios pasos.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: 40,
      isTicketingEnabled: true,
      status: 'approved',
      media: [],
    },
    {
      id: eventId(10),
      tenantId: TENANT_ID,
      title: 'Seminario IA',
      category: 'event',
      startAt: addDays(now, 10).toISOString(),
      endAt: null,
      city: 'Córdoba',
      venueName: 'Universidad',
      coverImageUrl: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg',
      description: 'Seminario sobre inteligencia artificial aplicada.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: 200,
      isTicketingEnabled: true,
      status: 'approved',
      media: [],
    },
    {
      id: 'event-gastro-01',
      tenantId: TENANT_ID,
      title: 'Brunch en Palermo',
      category: 'gastro',
      startAt: addDays(now, 5).toISOString(),
      endAt: null,
      city: 'Buenos Aires',
      venueName: 'Café Palermo',
      coverImageUrl: 'https://images.pexels.com/photos/1095550/pexels-photo-1095550.jpeg',
      description: 'Brunch especial de fin de semana.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: 30,
      isTicketingEnabled: true,
      status: 'approved',
      media: [],
    },
    {
      id: 'event-excursion-01',
      tenantId: TENANT_ID,
      title: 'Trekking en Córdoba',
      category: 'excursion',
      startAt: addDays(now, 12).toISOString(),
      endAt: null,
      city: 'Córdoba',
      venueName: 'Sierras',
      coverImageUrl: 'https://images.pexels.com/photos/672358/pexels-photo-672358.jpeg',
      description: 'Senderismo guiado por las sierras cordobesas.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: 25,
      isTicketingEnabled: true,
      status: 'approved',
      media: [],
    },
    {
      id: 'event-rental-01',
      tenantId: TENANT_ID,
      title: 'Cabaña en Mendoza',
      category: 'rental',
      startAt: addDays(now, 20).toISOString(),
      endAt: null,
      city: 'Mendoza',
      venueName: 'Valle de Uco',
      coverImageUrl: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg',
      description: 'Alquiler de cabaña para fin de semana en la montaña.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: 8,
      isTicketingEnabled: true,
      status: 'approved',
      media: [],
    },
    {
      id: 'event-pending-01',
      tenantId: TENANT_ID,
      producerId: PRODUCER_ID,
      title: 'Noche de Jazz (pendiente)',
      category: 'event',
      startAt: addDays(now, 25).toISOString(),
      endAt: null,
      city: 'Buenos Aires',
      venueName: 'Club de Jazz',
      coverImageUrl: 'https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg',
      description: 'Evento pendiente de aprobación.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: 200,
      isTicketingEnabled: true,
      status: 'pending',
      media: [],
    },
    {
      id: 'event-pending-02',
      tenantId: TENANT_ID,
      title: 'Feria Artesanal',
      category: 'event',
      startAt: addDays(now, 35).toISOString(),
      endAt: null,
      city: 'Mendoza',
      venueName: 'Plaza Chile',
      coverImageUrl: 'https://images.pexels.com/photos/676662/pexels-photo-676662.jpeg',
      description: 'Feria de artesanos locales pendiente de aprobación.',
      venueAddress: null,
      geoLat: null,
      geoLng: null,
      capacityTotal: null,
      isTicketingEnabled: false,
      status: 'pending',
      media: [],
    },
  ];
  events.forEach((e) => db.create('events', e));

  // ticketTypes per event (2–3 per event)
  const ticketTypeNames = ['General', 'VIP', 'Early Bird'];
  const eventIdsWithTicketing = events.filter((e) => e.isTicketingEnabled).map((e) => e.id);
  for (const evId of eventIdsWithTicketing) {
    const count = 2 + (evId.length % 2);
    for (let i = 0; i < count; i++) {
      db.create('ticketTypes', {
        id: ticketTypeId(evId, i),
        eventId: evId,
        name: ticketTypeNames[i] ?? `Tipo ${i}`,
        price: [0, 1500, 3500][i] ?? 1000,
        capacityAvailable: 50 - i * 10,
      });
    }
  }

  // orders + tickets owned by USER
  const order1Id = 'order-01';
  const order2Id = 'order-02';
  db.create('orders', {
    id: order1Id,
    tenantId: TENANT_ID,
    eventId: eventId(1),
    status: 'paid',
    buyerEmail: 'user@demo.local',
    totalAmount: 3000,
    buyerUserId: USER_IDS.USER,
  });
  db.create('orders', {
    id: order2Id,
    tenantId: TENANT_ID,
    eventId: eventId(2),
    status: 'paid',
    buyerEmail: 'user@demo.local',
    totalAmount: 1500,
    buyerUserId: USER_IDS.USER,
  });

  const ticketTypeEv1 = ticketTypeId(eventId(1), 0);
  const ticketTypeEv2 = ticketTypeId(eventId(2), 0);
  db.create('tickets', {
    id: 'ticket-01',
    eventId: eventId(1),
    orderId: order1Id,
    ticketTypeId: ticketTypeEv1,
    qrPayload: 'yti:v1:ticket-01',
    status: 'VALID',
    ownerUserId: USER_IDS.USER,
  });
  db.create('tickets', {
    id: 'ticket-02',
    eventId: eventId(1),
    orderId: order1Id,
    ticketTypeId: ticketTypeEv1,
    qrPayload: 'yti:v1:ticket-02',
    status: 'USED',
    ownerUserId: USER_IDS.USER,
    usedAt: new Date().toISOString(),
  });
  db.create('tickets', {
    id: 'ticket-03',
    eventId: eventId(2),
    orderId: order2Id,
    ticketTypeId: ticketTypeEv2,
    qrPayload: 'yti:v1:ticket-03',
    status: 'VALID',
    ownerUserId: USER_IDS.USER,
  });

  // a few reviews
  db.create('reviews', {
    id: 'review-01',
    eventId: eventId(1),
    score: 5,
    title: 'Excelente',
    comment: 'Muy buen evento.',
    userName: 'Buyer User',
    createdAt: new Date().toISOString(),
  });

  // referral link for event 1 (assigned to referrer)
  db.create('referralLinks', {
    id: 'ref-01',
    eventId: eventId(1),
    tenantId: TENANT_ID,
    code: 'demo2025',
    label: 'Demo campaign',
    attributedOrdersCount: 1,
    referrerUserId: USER_IDS.REFERRER,
    createdAt: new Date().toISOString(),
  });

  // payout requests (demo for producer)
  db.create('payoutRequests', {
    id: 'payout-01',
    tenantId: TENANT_ID,
    eventId: eventId(1),
    producerId: PRODUCER_ID,
    status: 'REQUESTED',
    amountCents: 250000,
    bankInfo: { titular: 'Demo Producer', banco: 'Banco Demo', cbu: '0000000000000000000000' },
    requestedByUserId: USER_IDS.PRODUCER,
    createdAt: new Date().toISOString(),
  });
  db.create('payoutRequests', {
    id: 'payout-02',
    tenantId: TENANT_ID,
    eventId: eventId(2),
    producerId: PRODUCER_ID,
    status: 'PENDING',
    amountCents: 75000,
    bankInfo: { titular: 'Demo Producer', banco: 'Banco Demo', cbu: '0000000000000000000000' },
    requestedByUserId: USER_IDS.PRODUCER,
    createdAt: new Date().toISOString(),
  });

  // referral commission demo (pending - referrer can request)
  db.create('referralCommissions', {
    id: 'comm-01',
    referrerId: USER_IDS.REFERRER,
    referralLinkId: 'ref-01',
    eventId: eventId(1),
    amountCents: 5000,
    status: 'PENDING',
    requestedAt: null,
    paidAt: null,
    confirmedByUserId: null,
  });

  // resale listings demo
  db.create('resaleListings', {
    id: 'resale-01',
    ticketId: 'ticket-01',
    eventId: eventId(1),
    sellerUserId: USER_IDS.USER,
    askingPriceCents: 2000,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  });
  db.create('resaleListings', {
    id: 'resale-02',
    ticketId: 'ticket-03',
    eventId: eventId(2),
    sellerUserId: USER_IDS.USER,
    askingPriceCents: 1200,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  });

  // gastro content demo (event-gastro-01)
  db.create('gastroContent', {
    id: 'gastro-content-01',
    eventId: 'event-gastro-01',
    type: 'editorial',
    title: 'Nuestra propuesta',
    body: 'Brunch especial los fines de semana.',
    imageUrl: null,
    sortOrder: 0,
  });
  db.create('gastroDiscounts', {
    id: 'discount-01',
    eventId: 'event-gastro-01',
    code: 'BRUNCH10',
    type: 'PERCENT',
    value: 10,
    validFrom: addDays(now, -7).toISOString(),
    validTo: addDays(now, 30).toISOString(),
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  });
  db.create('gastroDiscountValidations', {
    id: 'val-01',
    discountId: 'discount-01',
    validatedAt: addDays(now, -2).toISOString(),
    userId: USER_IDS.USER,
    orderId: 'order-01',
  });

  // courtesy grant for event 1
  db.create('courtesyGrants', {
    id: 'grant-01',
    eventId: eventId(1),
    mode: 'CONSUMES_BATCH',
    ticketTypeId: ticketTypeEv1,
    quantity: 5,
    issued: 3,
    note: 'Press',
    createdById: USER_IDS.PRODUCER,
    createdAt: new Date().toISOString(),
  });
}

function addDays(d: Date, days: number, hours = 0): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  out.setHours(out.getHours() + hours);
  return out;
}

const APP_COLLECTIONS = [
  'tenants',
  'users',
  'producers',
  'events',
  'ticketTypes',
  'orders',
  'tickets',
  'reviews',
  'referralLinks',
  'courtesyGrants',
  'payoutRequests',
  'resaleListings',
  'referralCommissions',
  'gastroContent',
  'gastroDiscounts',
  'gastroDiscountValidations',
] as const;

/** Clear all app collections. */
export function resetLocalDB(db: LocalDB): void {
  for (const c of APP_COLLECTIONS) {
    try {
      db.clear(c);
    } catch {
      // ignore if collection doesn't exist
    }
  }
}

/** Export all app data as JSON. */
export function exportLocalDBAsJson(db: LocalDB): Record<string, unknown[]> {
  const out: Record<string, unknown[]> = {};
  for (const c of APP_COLLECTIONS) {
    try {
      out[c] = db.list(c);
    } catch {
      out[c] = [];
    }
  }
  return out;
}
