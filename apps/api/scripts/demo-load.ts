/**
 * Demo content load — idempotent.
 * Uses cuenta_cargas@demo.com for events + gastro, admin for excursions + rentals.
 *
 * Prerequisites: run demo:seed first (tenant + admin).
 * Run: pnpm run demo:load
 *
 * Duplicate prevention: uses stable IDs (demo-load-*) to skip existing records.
 */

import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = 'tenant-demo';
const CARGA_EMAIL = 'cuenta_cargas@demo.com';
const ADMIN_EMAIL = 'admin@demo.local';
const CARGA_PASSWORD = 'demo';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt.toString('hex')}:${hash}`;
}

function addDays(d: Date, days: number, hours = 0): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  out.setHours(out.getHours() + hours);
  return out;
}

// ─── Events (cuenta_cargas) ───────────────────────────────────────────────
const DEMO_EVENTS: Array<{
  id: string;
  category: string;
  title: string;
  description: string;
  city: string;
  venueName: string;
  venueAddress?: string;
  coverImageUrl: string;
  startAt: Date;
  ratingAvg: number;
  ratingCount: number;
  fromPrice: number;
  isTicketing?: boolean;
}> = [
  {
    id: 'demo-load-event-electronica',
    category: 'event',
    title: 'Noche de Música Electrónica',
    description:
      'Los mejores DJs de la Patagonia en una noche inolvidable. Producción de sonido premium y ambientación única en el centro de Bariloche.',
    city: 'Bariloche',
    venueName: 'Club Cervecería Patagonia',
    venueAddress: 'Av. Bustillo km 11.5',
    coverImageUrl: 'https://images.pexels.com/photos/274131/pexels-photo-274131.jpeg',
    startAt: addDays(new Date(), 7, 22),
    ratingAvg: 4.7,
    ratingCount: 89,
    fromPrice: 8500,
    isTicketing: true,
  },
  {
    id: 'demo-load-event-rock',
    category: 'event',
    title: 'Rock en Vivo — Bandas Locales',
    description: 'Noche de rock patagónico con tres bandas en escena. Barra completa y ambiente vibrante en el corazón de San Carlos.',
    city: 'Bariloche',
    venueName: 'Teatro del Lago',
    coverImageUrl: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg',
    startAt: addDays(new Date(), 10, 21),
    ratingAvg: 4.6,
    ratingCount: 156,
    fromPrice: 4500,
    isTicketing: true,
  },
  {
    id: 'demo-load-event-foodfair',
    category: 'event',
    title: 'Feria Gastronómica Primaveral',
    description:
      'Más de 30 food trucks, chefs invitados y música en vivo. Entrada libre con degustaciones pagas. Productos regionales y artesanales.',
    city: 'Bariloche',
    venueName: 'Parque Municipal',
    coverImageUrl: 'https://images.pexels.com/photos/1199957/pexels-photo-1199957.jpeg',
    startAt: addDays(new Date(), 14, 11),
    ratingAvg: 4.5,
    ratingCount: 312,
    fromPrice: 0,
  },
  {
    id: 'demo-load-event-comedy',
    category: 'event',
    title: 'Stand-up Comedy Night',
    description: 'Los mejores comediantes del circuito patagónico. Noche de risas garantizadas con vista al Nahuel Huapi.',
    city: 'Bariloche',
    venueName: 'Comedy Club Patagonia',
    coverImageUrl: 'https://images.pexels.com/photos/799091/pexels-photo-799091.jpeg',
    startAt: addDays(new Date(), 5, 21),
    ratingAvg: 4.8,
    ratingCount: 203,
    fromPrice: 6000,
    isTicketing: true,
  },
  {
    id: 'demo-load-event-tango',
    category: 'event',
    title: 'Milonga Nocturna Patagónica',
    description: 'Noche de tango tradicional con clase abierta y milonga hasta el amanecer. Pista de baile y bar completo.',
    city: 'Bariloche',
    venueName: 'La Esquina del Tango',
    coverImageUrl: 'https://images.pexels.com/photos/2105802/pexels-photo-2105802.jpeg',
    startAt: addDays(new Date(), 3, 22),
    ratingAvg: 4.6,
    ratingCount: 124,
    fromPrice: 3500,
    isTicketing: true,
  },
];

// ─── Gastro (cuenta_cargas) ───────────────────────────────────────────────
const DEMO_GASTRO: Array<{
  id: string;
  title: string;
  description: string;
  city: string;
  venueName: string;
  venueAddress?: string;
  coverImageUrl: string;
  startAt: Date;
  ratingAvg: number;
  ratingCount: number;
  fromPrice: number;
}> = [
  {
    id: 'demo-load-gastro-burger',
    title: 'La Burguesía — Promo Gourmet Burgers',
    description:
      'Hamburguesas artesanales con cortes premium de la región. Papas fritas hechas a mano y salsas de autor. 20% off con código DEMO20.',
    city: 'Bariloche',
    venueName: 'La Burguesía',
    venueAddress: 'Mitre 234',
    coverImageUrl: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg',
    startAt: addDays(new Date(), 1, 12),
    ratingAvg: 4.6,
    ratingCount: 234,
    fromPrice: 7500,
  },
  {
    id: 'demo-load-gastro-pizza',
    category: 'gastro',
    title: 'Pizza Night — 2x1 en Pizzas',
    description:
      'Noche de pizza artesanal con masa madre. 2x1 en pizzas medianas los jueves. Horno a leña y ingredientes locales.',
    city: 'Bariloche',
    venueName: 'Pizzería El Cóndor',
    coverImageUrl: 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg',
    startAt: addDays(new Date(), 4, 20),
    ratingAvg: 4.5,
    ratingCount: 189,
    fromPrice: 5500,
  },
  {
    id: 'demo-load-gastro-brunch',
    category: 'gastro',
    title: 'Brunch Especial de Fin de Semana',
    description:
      'Brunch completo con huevos benedict, pancakes, jugos naturales y café de especialidad. Válido sábados y domingos de 10 a 14hs.',
    city: 'Bariloche',
    venueName: 'Café Panorámico',
    coverImageUrl: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
    startAt: addDays(new Date(), 0, 10),
    ratingAvg: 4.8,
    ratingCount: 156,
    fromPrice: 4200,
  },
  {
    id: 'demo-load-gastro-2x1',
    category: 'gastro',
    title: '2x1 en Tragos — Happy Hour',
    description:
      'Happy hour de 18 a 21hs. 2x1 en todos los tragos y cervezas artesanales. Terraza con vista al lago.',
    city: 'Bariloche',
    venueName: 'Bar del Lago',
    coverImageUrl: 'https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg',
    startAt: addDays(new Date(), 2, 18),
    ratingAvg: 4.5,
    ratingCount: 312,
    fromPrice: 3500,
  },
  {
    id: 'demo-load-gastro-cordero',
    category: 'gastro',
    title: 'Cena Patagónica — Cordero al Asador',
    description:
      'Cordero patagónico al asador, trucha de río y frutos rojos. Menú degustación con vinos de la región. Cupón 15% descuento.',
    city: 'Bariloche',
    venueName: 'El Boliche de Alberto',
    coverImageUrl: 'https://images.pexels.com/photos/1581384/pexels-photo-1581384.jpeg',
    startAt: addDays(new Date(), 6, 20),
    ratingAvg: 4.7,
    ratingCount: 167,
    fromPrice: 15000,
  },
];

// ─── Excursions (admin) ───────────────────────────────────────────────────
const DEMO_EXCURSIONS: Array<{
  id: string;
  title: string;
  description: string;
  city: string;
  venueName: string;
  coverImageUrl: string;
  startAt: Date;
  ratingAvg: number;
  ratingCount: number;
  fromPrice: number;
}> = [
  {
    id: 'demo-load-excursion-lagos',
    title: 'Navegación por Lagos Nahuel Huapi',
    description:
      'Paseo en catamarán por los lagos Nahuel Huapi y Perito Moreno. Guía bilingüe y paradas en isla Victoria.',
    city: 'Bariloche',
    venueName: 'Turisur',
    coverImageUrl: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg',
    startAt: addDays(new Date(), 8, 9),
    ratingAvg: 4.8,
    ratingCount: 234,
    fromPrice: 18000,
  },
  {
    id: 'demo-load-excursion-trek',
    title: 'Trekking Cerro Catedral',
    description:
      'Ascenso guiado al Cerro Catedral. Dificultad media. Incluye merienda y traslado desde Bariloche.',
    city: 'Bariloche',
    venueName: 'Andina Aventura',
    coverImageUrl: 'https://images.pexels.com/photos/672358/pexels-photo-672358.jpeg',
    startAt: addDays(new Date(), 9, 7),
    ratingAvg: 4.7,
    ratingCount: 89,
    fromPrice: 12000,
  },
  {
    id: 'demo-load-excursion-circuito',
    title: 'Circuito Chico — Panorámico',
    description:
      'Recorrido en minibús por el Circuito Chico. Paradas en miradores y puntos clave con vista a los lagos.',
    city: 'Bariloche',
    venueName: 'Transporte Turístico Bariloche',
    coverImageUrl: 'https://images.pexels.com/photos/1519689/pexels-photo-1519689.jpeg',
    startAt: addDays(new Date(), 11, 10),
    ratingAvg: 4.5,
    ratingCount: 156,
    fromPrice: 8500,
  },
  {
    id: 'demo-load-excursion-nieve',
    title: 'Experiencia Nieve — Primeros Pasos',
    description:
      'Clase de esquí o snowboard para principiantes. Incluye equipo completo y profesor certificado.',
    city: 'Bariloche',
    venueName: 'Cerro Catedral',
    coverImageUrl: 'https://images.pexels.com/photos/848588/pexels-photo-848588.jpeg',
    startAt: addDays(new Date(), 15, 9),
    ratingAvg: 4.6,
    ratingCount: 201,
    fromPrice: 22000,
  },
];

// ─── Rentals (admin) ──────────────────────────────────────────────────────
const DEMO_RENTALS: Array<{
  id: string;
  title: string;
  description: string;
  city: string;
  venueName: string;
  coverImageUrl: string;
  startAt: Date;
  ratingAvg: number;
  ratingCount: number;
  fromPrice: number;
}> = [
  {
    id: 'demo-load-rental-bike',
    title: 'Alquiler de Bicicletas',
    description:
      'Bicis urbanas y de montaña. Por hora o día. Cascos y candados incluidos. Entrega en centro y circuito chico.',
    city: 'Bariloche',
    venueName: 'Bike Rental Patagonia',
    coverImageUrl: 'https://images.pexels.com/photos/1437713/pexels-photo-1437713.jpeg',
    startAt: addDays(new Date(), 0, 8),
    ratingAvg: 4.5,
    ratingCount: 189,
    fromPrice: 3500,
  },
  {
    id: 'demo-load-rental-kayak',
    title: 'Kayaks y Canoas',
    description:
      'Alquiler de kayaks para navegación en lagos. Incluye chalecos y remos. Rutas guiadas opcionales.',
    city: 'Bariloche',
    venueName: 'Kayak & Trek',
    coverImageUrl: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg',
    startAt: addDays(new Date(), 7, 9),
    ratingAvg: 4.7,
    ratingCount: 134,
    fromPrice: 8000,
  },
  {
    id: 'demo-load-rental-ski',
    title: 'Equipo de Esquí y Snowboard',
    description:
      'Alquiler por día o semana. Incluye botas, esquíes o tabla y bastones. Recogida en hotel disponible.',
    city: 'Bariloche',
    venueName: 'Ski Rental Catedral',
    coverImageUrl: 'https://images.pexels.com/photos/37542/skiing-ski-mountains-sport-37542.jpeg',
    startAt: addDays(new Date(), 14, 8),
    ratingAvg: 4.6,
    ratingCount: 267,
    fromPrice: 12000,
  },
  {
    id: 'demo-load-rental-camping',
    title: 'Equipo de Camping',
    description:
      'Carpas, sleeping bags, colchonetas y cocinilla. Ideal para refugios y trekking en la cordillera.',
    city: 'Bariloche',
    venueName: 'Outdoor Rental Patagonia',
    coverImageUrl: 'https://images.pexels.com/photos/2422588/pexels-photo-2422588.jpeg',
    startAt: addDays(new Date(), 1, 9),
    ratingAvg: 4.4,
    ratingCount: 92,
    fromPrice: 5000,
  },
];

async function ensureCuentaCargas(tenantId: string) {
  let user = await prisma.user.findFirst({
    where: { tenantId, email: CARGA_EMAIL, deletedAt: null },
  });

  if (!user) {
    const passwordHash = hashPassword(CARGA_PASSWORD);
    user = await prisma.user.create({
      data: {
        tenantId,
        email: CARGA_EMAIL,
        passwordHash,
        firstName: 'Cuenta',
        lastName: 'Cargas Demo',
        role: 'PRODUCER_OWNER',
        status: 'ACTIVE',
      },
    });
    console.log('Created user:', CARGA_EMAIL);
  }

  let producerProfile = await prisma.producerProfile.findFirst({
    where: {
      tenantId,
      memberships: { some: { userId: user!.id, status: 'ACTIVE' } },
      status: 'ACTIVE',
    },
  });

  if (!producerProfile) {
    producerProfile = await prisma.producerProfile.create({
      data: {
        tenantId,
        displayName: 'Cuenta Cargas Producciones',
        legalName: 'Cuenta Cargas Demo',
        description: 'Productor y gastro demo para Yo Te Invito',
        city: 'Bariloche',
        country: 'Argentina',
        createdByUserId: user!.id,
        status: 'ACTIVE',
      },
    });
    await prisma.userProducerMembership.create({
      data: {
        tenantId,
        userId: user!.id,
        profileId: producerProfile.id,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });
    console.log('Created producer profile for', CARGA_EMAIL);
  }

  let gastroProfile = await prisma.gastroProfile.findFirst({
    where: {
      tenantId,
      memberships: { some: { userId: user!.id, status: 'ACTIVE' } },
      status: 'ACTIVE',
    },
  });

  if (!gastroProfile) {
    gastroProfile = await prisma.gastroProfile.create({
      data: {
        tenantId,
        displayName: 'Gastro Demo Bariloche',
        legalName: 'Gastro Demo',
        description: 'Ofertas gastronómicas y descuentos en Bariloche',
        city: 'Bariloche',
        address: 'Av. Mitre 234',
        createdByUserId: user!.id,
        status: 'ACTIVE',
      },
    });
    await prisma.userGastroMembership.create({
      data: {
        tenantId,
        userId: user!.id,
        profileId: gastroProfile.id,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });
    console.log('Created gastro profile for', CARGA_EMAIL);
  }

  return { user, producerProfile };
}

async function ensureAdminProducer(tenantId: string) {
  const admin = await prisma.user.findFirst({
    where: { tenantId, role: 'ADMIN', deletedAt: null },
  });
  if (!admin) {
    throw new Error('Admin user not found. Run demo:seed first.');
  }

  let producerProfile = await prisma.producerProfile.findFirst({
    where: {
      tenantId,
      memberships: { some: { userId: admin.id, status: 'ACTIVE' } },
      status: 'ACTIVE',
    },
  });

  if (!producerProfile) {
    producerProfile = await prisma.producerProfile.create({
      data: {
        tenantId,
        displayName: 'Excursiones y Rentals Admin',
        legalName: 'Demo Admin',
        description: 'Excursiones y alquileres de la plataforma',
        city: 'Bariloche',
        country: 'Argentina',
        createdByUserId: admin.id,
        status: 'ACTIVE',
      },
    });
    await prisma.userProducerMembership.create({
      data: {
        tenantId,
        userId: admin.id,
        profileId: producerProfile.id,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });
    console.log('Created producer profile for admin (excursions/rentals)');
  }

  return { admin, producerProfile };
}

async function upsertEvent(
  tenantId: string,
  producerId: string,
  producerProfileId: string,
  ev: (typeof DEMO_EVENTS)[0] | (typeof DEMO_GASTRO)[0] | (typeof DEMO_EXCURSIONS)[0] | (typeof DEMO_RENTALS)[0],
  category: string
) {
  const startAt = ev.startAt;
  const endAt = new Date(startAt.getTime() + 4 * 60 * 60 * 1000);
  const existing = await prisma.event.findUnique({ where: { id: ev.id } });

  const base = {
    tenantId,
    producerId,
    producerProfileId,
    category,
    title: ev.title,
    description: ev.description,
    city: ev.city,
    venueName: ev.venueName,
    venueAddress: 'venueAddress' in ev ? ev.venueAddress : undefined,
    coverImageUrl: ev.coverImageUrl,
    startAt,
    endAt,
    status: 'APPROVED' as const,
    publishedAt: new Date(),
    ratingAvg: ev.ratingAvg,
    ratingCount: ev.ratingCount,
    isTicketingEnabled: 'isTicketing' in ev && ev.isTicketing,
    capacityTotal: 100,
  };

  if (existing) {
    await prisma.event.update({
      where: { id: ev.id },
      data: base,
    });
    return 'updated';
  }

  await prisma.event.create({
    data: { id: ev.id, ...base },
  });
  return 'created';
}

async function ensureTicketType(eventId: string, fromPrice: number) {
  const existing = await prisma.ticketType.findFirst({
    where: { eventId },
  });
  if (existing) return;
  await prisma.ticketType.create({
    data: {
      eventId,
      name: 'General',
      description: 'Entrada general',
      price: fromPrice,
      currency: 'ARS',
      capacityTotal: 100,
      capacityAvailable: 100,
      maxPerOrder: 10,
      status: 'ACTIVE',
    },
  });
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    console.error('Tenant not found. Run demo:seed first.');
    process.exit(1);
  }

  const { user: cargaUser, producerProfile: cargaProducer } = await ensureCuentaCargas(tenant.id);
  const { admin, producerProfile: adminProducer } = await ensureAdminProducer(tenant.id);

  let eventsCreated = 0;
  let eventsUpdated = 0;
  let gastroCreated = 0;
  let gastroUpdated = 0;
  let excursionsCreated = 0;
  let excursionsUpdated = 0;
  let rentalsCreated = 0;
  let rentalsUpdated = 0;

  for (const ev of DEMO_EVENTS) {
    const result = await upsertEvent(tenant.id, cargaUser.id, cargaProducer.id, ev, 'event');
    if (result === 'created') eventsCreated++;
    else eventsUpdated++;
    if (ev.isTicketing !== false) {
      await ensureTicketType(ev.id, ev.fromPrice);
    }
  }

  for (const ev of DEMO_GASTRO) {
    const result = await upsertEvent(tenant.id, cargaUser.id, cargaProducer.id, ev, 'gastro');
    if (result === 'created') gastroCreated++;
    else gastroUpdated++;
  }

  for (const ev of DEMO_EXCURSIONS) {
    const result = await upsertEvent(tenant.id, admin.id, adminProducer.id, ev, 'excursion');
    if (result === 'created') excursionsCreated++;
    else excursionsUpdated++;
    await ensureTicketType(ev.id, ev.fromPrice);
  }

  for (const ev of DEMO_RENTALS) {
    const result = await upsertEvent(tenant.id, admin.id, adminProducer.id, ev, 'rental');
    if (result === 'created') rentalsCreated++;
    else rentalsUpdated++;
    await ensureTicketType(ev.id, ev.fromPrice);
  }

  console.log('\n=== Demo content load complete ===\n');
  console.log('Account usage:');
  console.log(`  Events:     ${CARGA_EMAIL} (${cargaUser.id})`);
  console.log(`  Gastro:     ${CARGA_EMAIL}`);
  console.log(`  Excursions: ${ADMIN_EMAIL} (admin)`);
  console.log(`  Rentals:    ${ADMIN_EMAIL} (admin)`);
  console.log('\nRecords created/updated:');
  console.log(`  Events:     ${eventsCreated} created, ${eventsUpdated} updated`);
  console.log(`  Gastro:     ${gastroCreated} created, ${gastroUpdated} updated`);
  console.log(`  Excursions: ${excursionsCreated} created, ${excursionsUpdated} updated`);
  console.log(`  Rentals:    ${rentalsCreated} created, ${rentalsUpdated} updated`);
  console.log('\nVisibility: All records status=APPROVED, publishedAt set.');
  console.log('Duplicate prevention: Stable IDs (demo-load-*), upsert by id.');
  console.log('\nRecommended flow: demo:seed -> demo:load');
  console.log('Password for cuenta_cargas@demo.com:', CARGA_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
