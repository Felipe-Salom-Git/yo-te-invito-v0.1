/**
 * Curated demo content — events, restaurants, hotels, excursions, rentals
 * for homepage rails and detail pages visual evaluation.
 *
 * Prerequisites: run demo:seed first (tenant, users, producer).
 * Run: pnpm run demo:seed-curated
 */

import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { ensureGastroDemoUser, ensureSampleGastroDiscountsForHome } from './gastro-demo-samples';

const prisma = new PrismaClient();
const TENANT_ID = 'tenant-demo';

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

const CURATED_EVENTS: Array<{
  id: string;
  category: string;
  title: string;
  description: string;
  city: string;
  venueName: string;
  coverImageUrl: string;
  startAt: Date;
  ratingAvg: number;
  ratingCount: number;
  fromPrice: number; // centavos
}> = [
  // ─── Eventos ─────────────────────────────────────────────────────────────
  {
    id: 'curated-event-music-01',
    category: 'event',
    title: 'Noche de Música Electrónica',
    description: 'DJs locales y producción de sonido premium. Ambientación íntima en el corazón de Palermo.',
    city: 'Buenos Aires',
    venueName: 'Club Niceto',
    coverImageUrl: 'https://images.pexels.com/photos/274131/pexels-photo-274131.jpeg',
    startAt: addDays(new Date(), 7, 22),
    ratingAvg: 4.7,
    ratingCount: 89,
    fromPrice: 8500,
  },
  {
    id: 'curated-event-rock-01',
    category: 'event',
    title: 'Rock en Vivo — Bandas Locales',
    description: 'Noche de rock argentino con tres bandas en escena. Barra completa y buen ambiente.',
    city: 'Buenos Aires',
    venueName: 'Teatro Vorterix',
    coverImageUrl: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg',
    startAt: addDays(new Date(), 10, 21),
    ratingAvg: 4.6,
    ratingCount: 156,
    fromPrice: 4500,
  },
  {
    id: 'curated-event-comedy-01',
    category: 'event',
    title: 'Stand-up Comedy Night',
    description: 'Los mejores comediantes del circuito. Noche de risas garantizadas.',
    city: 'Buenos Aires',
    venueName: 'Comedy Club Palermo',
    coverImageUrl: 'https://images.pexels.com/photos/799091/pexels-photo-799091.jpeg',
    startAt: addDays(new Date(), 5, 21),
    ratingAvg: 4.8,
    ratingCount: 203,
    fromPrice: 6000,
  },
  {
    id: 'curated-event-foodfair-01',
    category: 'event',
    title: 'Feria Gastronómica Primaveral',
    description: 'Más de 50 food trucks, chefs invitados y música en vivo. Entrada libre con degustaciones pagas.',
    city: 'Buenos Aires',
    venueName: 'Parque 3 de Febrero',
    coverImageUrl: 'https://images.pexels.com/photos/1199957/pexels-photo-1199957.jpeg',
    startAt: addDays(new Date(), 14, 11),
    ratingAvg: 4.5,
    ratingCount: 312,
    fromPrice: 0,
  },
  {
    id: 'curated-event-family-01',
    category: 'event',
    title: 'Feria Familiar — Juegos y Shows',
    description: 'Actividades para chicos, food trucks y espectáculos en vivo. Ideal para toda la familia.',
    city: 'Córdoba',
    venueName: 'Parque Sarmiento',
    coverImageUrl: 'https://images.pexels.com/photos/1648382/pexels-photo-1648382.jpeg',
    startAt: addDays(new Date(), 12, 14),
    ratingAvg: 4.4,
    ratingCount: 78,
    fromPrice: 2000,
  },
  {
    id: 'curated-event-premium-01',
    category: 'event',
    title: 'Cena de Gala — Temporada 2025',
    description: 'Experiencia gastronómica exclusiva con menú degustación y maridaje. Cupos limitados.',
    city: 'Buenos Aires',
    venueName: 'Alvear Palace Hotel',
    coverImageUrl: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg',
    startAt: addDays(new Date(), 21, 20),
    ratingAvg: 4.9,
    ratingCount: 45,
    fromPrice: 45000,
  },
  {
    id: 'curated-event-tango-01',
    category: 'event',
    title: 'Milonga Nocturna',
    description: 'Noche de tango tradicional. Clase abierta y milonga hasta el amanecer.',
    city: 'Buenos Aires',
    venueName: 'La Viruta',
    coverImageUrl: 'https://images.pexels.com/photos/2105802/pexels-photo-2105802.jpeg',
    startAt: addDays(new Date(), 3, 22),
    ratingAvg: 4.6,
    ratingCount: 124,
    fromPrice: 3500,
  },
  {
    id: 'curated-event-workshop-01',
    category: 'event',
    title: 'Workshop de Cócteles',
    description: 'Aprendé a preparar cócteles clásicos y de autor. Incluye materias primas y degustación.',
    city: 'Mendoza',
    venueName: 'Bar de los Fundadores',
    coverImageUrl: 'https://images.pexels.com/photos/1187773/pexels-photo-1187773.jpeg',
    startAt: addDays(new Date(), 18, 19),
    ratingAvg: 4.7,
    ratingCount: 67,
    fromPrice: 12000,
  },
  // ─── Gastronomía / Restaurantes ─────────────────────────────────────────
  {
    id: 'curated-gastro-burger-01',
    category: 'gastro',
    title: 'La Burguesía — Gourmet Burgers',
    description: 'Hamburguesas artesanales con cortes premium. Papas fritas hechas a mano y salsas de autor.',
    city: 'Buenos Aires',
    venueName: 'La Burguesía',
    coverImageUrl: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg',
    startAt: addDays(new Date(), 1, 12),
    ratingAvg: 4.6,
    ratingCount: 234,
    fromPrice: 7500,
  },
  {
    id: 'curated-gastro-coffee-01',
    category: 'gastro',
    title: 'Café de Especialidad — Tostadores',
    description: 'Café de origen único. Tostado propio y métodos de filtrado. Repostería artesanal.',
    city: 'Buenos Aires',
    venueName: 'Coffee Lab',
    coverImageUrl: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
    startAt: addDays(new Date(), 0, 8),
    ratingAvg: 4.8,
    ratingCount: 189,
    fromPrice: 2200,
  },
  {
    id: 'curated-gastro-sushi-01',
    category: 'gastro',
    title: 'Omakase Sushi Bar',
    description: 'Experiencia omakase con pescado fresco del día. Barra limitada y reserva previa.',
    city: 'Buenos Aires',
    venueName: 'Sushi Koi',
    coverImageUrl: 'https://images.pexels.com/photos/1028425/pexels-photo-1028425.jpeg',
    startAt: addDays(new Date(), 2, 20),
    ratingAvg: 4.9,
    ratingCount: 98,
    fromPrice: 28000,
  },
  {
    id: 'curated-gastro-brewery-01',
    category: 'gastro',
    title: 'Cervecería Artesanal — Tap Room',
    description: 'Cervezas propias y de otras cervecerías. Menú de pub y ambiente distendido.',
    city: 'Córdoba',
    venueName: 'Antares Córdoba',
    coverImageUrl: 'https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg',
    startAt: addDays(new Date(), 4, 18),
    ratingAvg: 4.5,
    ratingCount: 312,
    fromPrice: 3500,
  },
  {
    id: 'curated-gastro-patagonia-01',
    category: 'gastro',
    title: 'Cocina Patagónica — Cordero y Trucha',
    description: 'Productos locales: cordero al asador, trucha de río, frutos rojos. Vinos de la región.',
    city: 'Bariloche',
    venueName: 'El Boliche de Alberto',
    coverImageUrl: 'https://images.pexels.com/photos/1581384/pexels-photo-1581384.jpeg',
    startAt: addDays(new Date(), 6, 13),
    ratingAvg: 4.7,
    ratingCount: 167,
    fromPrice: 15000,
  },
  // ─── Hoteles / alojamiento ───────────────────────────────────────────────
  {
    id: 'curated-hotel-boutique-01',
    category: 'hotel',
    title: 'Hotel Boutique Palermo',
    description: 'Habitaciones de diseño, desayuno regional y terraza. A pasos de Plaza Serrano.',
    city: 'Buenos Aires',
    venueName: 'Hotel Boutique Palermo',
    coverImageUrl: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg',
    startAt: addDays(new Date(), 1, 15),
    ratingAvg: 4.7,
    ratingCount: 412,
    fromPrice: 0,
  },
  {
    id: 'curated-hotel-lake-01',
    category: 'hotel',
    title: 'Lodge con Vista al Lago',
    description: 'Cabañas y suites con vista al Nahuel Huapi. Spa, desayuno incluido y traslado al aeropuerto.',
    city: 'Bariloche',
    venueName: 'Lodge Nahuel',
    coverImageUrl: 'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg',
    startAt: addDays(new Date(), 3, 14),
    ratingAvg: 4.9,
    ratingCount: 267,
    fromPrice: 0,
  },
  {
    id: 'curated-hotel-wine-01',
    category: 'hotel',
    title: 'Posada en Viñedo — Valle de Uco',
    description: 'Alojamiento entre viñedos, catas y cocina regional. Ideal para escapada enológica.',
    city: 'Mendoza',
    venueName: 'Posada del Viñedo',
    coverImageUrl: 'https://images.pexels.com/photos/1648771/pexels-photo-1648771.jpeg',
    startAt: addDays(new Date(), 5, 12),
    ratingAvg: 4.8,
    ratingCount: 198,
    fromPrice: 0,
  },
  {
    id: 'curated-hotel-city-01',
    category: 'hotel',
    title: 'Hotel Urbano Córdoba Centro',
    description: 'Habitaciones ejecutivas, cowork y gym. A metros del centro histórico.',
    city: 'Córdoba',
    venueName: 'Urbano Córdoba',
    coverImageUrl: 'https://images.pexels.com/photos/271743/pexels-photo-271743.jpeg',
    startAt: addDays(new Date(), 2, 16),
    ratingAvg: 4.5,
    ratingCount: 523,
    fromPrice: 0,
  },
  {
    id: 'curated-gastro-parrilla-01',
    category: 'gastro',
    title: 'Parrilla Tradicional',
    description: 'Carnes a la parrilla, achuras y papas fritas. Ambiente clásico y porciones abundantes.',
    city: 'Buenos Aires',
    venueName: 'La Brigada',
    coverImageUrl: 'https://images.pexels.com/photos/3535383/pexels-photo-3535383.jpeg',
    startAt: addDays(new Date(), 0, 12),
    ratingAvg: 4.6,
    ratingCount: 445,
    fromPrice: 9000,
  },
  // ─── Excursiones ────────────────────────────────────────────────────────
  {
    id: 'curated-excursion-lake-01',
    category: 'excursion',
    title: 'Navegación por Lagos',
    description: 'Paseo en catamarán por los lagos Nahuel Huapi y Perito Moreno. Guía bilingüe.',
    city: 'Bariloche',
    venueName: 'Turisur',
    coverImageUrl: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg',
    startAt: addDays(new Date(), 8, 9),
    ratingAvg: 4.8,
    ratingCount: 234,
    fromPrice: 18000,
  },
  {
    id: 'curated-excursion-trek-01',
    category: 'excursion',
    title: 'Trekking Cerro Catedral',
    description: 'Ascenso guiado al Cerro Catedral. Dificultad media. Incluye merienda y traslado.',
    city: 'Bariloche',
    venueName: 'Andina Aventura',
    coverImageUrl: 'https://images.pexels.com/photos/672358/pexels-photo-672358.jpeg',
    startAt: addDays(new Date(), 9, 7),
    ratingAvg: 4.7,
    ratingCount: 89,
    fromPrice: 12000,
  },
  {
    id: 'curated-excursion-circuit-01',
    category: 'excursion',
    title: 'Circuito Chico — Panorámico',
    description: 'Recorrido en minibús por el Circuito Chico. Paradas en miradores y puntos clave.',
    city: 'Bariloche',
    venueName: 'Transporte Turístico Bariloche',
    coverImageUrl: 'https://images.pexels.com/photos/1519689/pexels-photo-1519689.jpeg',
    startAt: addDays(new Date(), 11, 10),
    ratingAvg: 4.5,
    ratingCount: 156,
    fromPrice: 8500,
  },
  {
    id: 'curated-excursion-snow-01',
    category: 'excursion',
    title: 'Experiencia Nieve — Primeros Pasos',
    description: 'Clase de esquí o snowboard para principiantes. Incluye equipo y profesor.',
    city: 'Bariloche',
    venueName: 'Cerro Catedral',
    coverImageUrl: 'https://images.pexels.com/photos/848588/pexels-photo-848588.jpeg',
    startAt: addDays(new Date(), 15, 9),
    ratingAvg: 4.6,
    ratingCount: 201,
    fromPrice: 22000,
  },
  {
    id: 'curated-excursion-horse-01',
    category: 'excursion',
    title: 'Cabalgata por las Sierras',
    description: 'Cabalgata de medio día por senderos cordobeses. Incluye asado y bebidas.',
    city: 'Córdoba',
    venueName: 'Estancia El Colibrí',
    coverImageUrl: 'https://images.pexels.com/photos/1353612/pexels-photo-1353612.jpeg',
    startAt: addDays(new Date(), 13, 9),
    ratingAvg: 4.7,
    ratingCount: 112,
    fromPrice: 15000,
  },
  {
    id: 'curated-excursion-wine-01',
    category: 'excursion',
    title: 'Ruta del Vino — Bodegas',
    description: 'Visita a tres bodegas con degustación. Almuerzo en viñedo y traslado incluido.',
    city: 'Mendoza',
    venueName: 'Mendoza Wine Tours',
    coverImageUrl: 'https://images.pexels.com/photos/1212590/pexels-photo-1212590.jpeg',
    startAt: addDays(new Date(), 16, 10),
    ratingAvg: 4.9,
    ratingCount: 278,
    fromPrice: 25000,
  },
  // ─── Rentals ────────────────────────────────────────────────────────────
  {
    id: 'curated-rental-bike-01',
    category: 'rental',
    title: 'Alquiler de Bicicletas',
    description: 'Bicis urbanas y de montaña. Por hora o día. Cascos y candados incluidos.',
    city: 'Buenos Aires',
    venueName: 'Bike Rental Palermo',
    coverImageUrl: 'https://images.pexels.com/photos/1437713/pexels-photo-1437713.jpeg',
    startAt: addDays(new Date(), 0, 8),
    ratingAvg: 4.5,
    ratingCount: 189,
    fromPrice: 3500,
  },
  {
    id: 'curated-rental-kayak-01',
    category: 'rental',
    title: 'Kayaks y Canoas',
    description: 'Alquiler de kayaks para navegación en lagos. Incluye chalecos y remos.',
    city: 'Bariloche',
    venueName: 'Kayak & Trek',
    coverImageUrl: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg',
    startAt: addDays(new Date(), 7, 9),
    ratingAvg: 4.7,
    ratingCount: 134,
    fromPrice: 8000,
  },
  {
    id: 'curated-rental-ski-01',
    category: 'rental',
    title: 'Equipo de Esquí y Snowboard',
    description: 'Alquiler por día o semana. Incluye botas, esquíes o tabla y bastones.',
    city: 'Bariloche',
    venueName: 'Ski Rental Catedral',
    coverImageUrl: 'https://images.pexels.com/photos/37542/skiing-ski-mountains-sport-37542.jpeg',
    startAt: addDays(new Date(), 14, 8),
    ratingAvg: 4.6,
    ratingCount: 267,
    fromPrice: 12000,
  },
  {
    id: 'curated-rental-4x4-01',
    category: 'rental',
    title: 'Transfer 4x4 — Alta Montaña',
    description: 'Traslado en 4x4 a refugios y puntos inaccesibles. Hasta 4 pasajeros.',
    city: 'Mendoza',
    venueName: 'Aconcagua Tours',
    coverImageUrl: 'https://images.pexels.com/photos/1525041/pexels-photo-1525041.jpeg',
    startAt: addDays(new Date(), 20, 7),
    ratingAvg: 4.8,
    ratingCount: 78,
    fromPrice: 45000,
  },
  {
    id: 'curated-rental-camping-01',
    category: 'rental',
    title: 'Equipo de Camping',
    description: 'Carpas, sleeping bags, colchonetas y cocinilla. Ideal para escapadas de fin de semana.',
    city: 'Córdoba',
    venueName: 'Outdoor Rental',
    coverImageUrl: 'https://images.pexels.com/photos/2422588/pexels-photo-2422588.jpeg',
    startAt: addDays(new Date(), 1, 9),
    ratingAvg: 4.4,
    ratingCount: 92,
    fromPrice: 5000,
  },
  {
    id: 'curated-rental-cabin-01',
    category: 'rental',
    title: 'Cabaña en Valle de Uco',
    description: 'Cabaña con vista a la cordillera. Capacidad 6 personas. Cocina equipada y parrilla.',
    city: 'Mendoza',
    venueName: 'Cabañas Los Cipreses',
    coverImageUrl: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg',
    startAt: addDays(new Date(), 2, 14),
    ratingAvg: 4.8,
    ratingCount: 56,
    fromPrice: 35000,
  },
];

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    console.error('Tenant not found. Run demo:seed first.');
    process.exit(1);
  }

  const admin = await prisma.user.findFirst({
    where: { tenantId: TENANT_ID, role: 'ADMIN', deletedAt: null },
  });
  if (!admin) {
    console.error('Admin user not found. Run demo:seed first.');
    process.exit(1);
  }

  let producerProfile = await prisma.producerProfile.findFirst({
    where: { tenantId: TENANT_ID, status: 'ACTIVE' },
  });
  if (!producerProfile) {
    producerProfile = await prisma.producerProfile.create({
      data: {
        tenantId: TENANT_ID,
        displayName: 'Demo Producer',
        createdByUserId: admin.id,
        status: 'ACTIVE',
      },
    });
    await prisma.userProducerMembership.create({
      data: {
        tenantId: TENANT_ID,
        userId: admin.id,
        profileId: producerProfile.id,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });
    console.log('Created producer profile for admin');
  }

  const producerId = admin.id;

  let created = 0;
  let updated = 0;

  for (const ev of CURATED_EVENTS) {
    const startAt = ev.startAt;
    const endAt = new Date(startAt.getTime() + 4 * 60 * 60 * 1000);

    const existing = await prisma.event.findUnique({
      where: { id: ev.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.event.update({
        where: { id: ev.id },
        data: {
          category: ev.category,
          title: ev.title,
          description: ev.description,
          city: ev.city,
          venueName: ev.venueName,
          coverImageUrl: ev.coverImageUrl,
          startAt,
          endAt,
          ratingAvg: ev.ratingAvg,
          ratingCount: ev.ratingCount,
          status: 'APPROVED',
        },
      });
      updated++;
    } else {
      await prisma.event.create({
        data: {
          id: ev.id,
          tenantId: TENANT_ID,
        producerId,
        producerProfileId: producerProfile.id,
          category: ev.category,
          title: ev.title,
          description: ev.description,
          city: ev.city,
          venueName: ev.venueName,
          coverImageUrl: ev.coverImageUrl,
          startAt,
          endAt,
          status: 'APPROVED',
          isTicketingEnabled: true,
          capacityTotal: 50,
          ratingAvg: ev.ratingAvg,
          ratingCount: ev.ratingCount,
        },
      });
      created++;
    }

    const tt = await prisma.ticketType.findFirst({
      where: { eventId: ev.id },
      select: { id: true },
    });
    if (!tt) {
      const evRow = await prisma.event.findUniqueOrThrow({
        where: { id: ev.id },
        select: { tenantId: true, endAt: true, startAt: true },
      });
      const now = new Date();
      const endAt = evRow.endAt ?? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      await prisma.ticketType.create({
        data: {
          tenantId: evRow.tenantId,
          eventId: ev.id,
          name: 'General',
          description: 'Entrada general',
          price: ev.fromPrice,
          currency: 'ARS',
          capacityTotal: 50,
          capacityAvailable: 50,
          maxPerOrder: 10,
          status: 'ACTIVE',
          batches: {
            create: {
              tenantId: evRow.tenantId,
              eventId: ev.id,
              orderIndex: 0,
              name: 'General',
              startAt: now,
              endAt,
              baseQuantity: 50,
              rolloverQuantity: 0,
              effectiveQuantity: 50,
              reservedQuantity: 0,
              soldCount: 0,
              price: ev.fromPrice,
              currency: 'ARS',
              status: 'ACTIVE',
            },
          },
        },
      });
    }
  }

  console.log('=== Curated demo content loaded ===\n');
  console.log(`Created: ${created} events`);
  console.log(`Updated: ${updated} events`);
  console.log(`Total: ${CURATED_EVENTS.length} curated entries`);
  console.log('');
  console.log('Categories: eventos, gastro, excursion, rental');
  console.log('Run demo:seed first if tenant/users are missing.');

  const { gastroProfileId } = await ensureGastroDemoUser(prisma, TENANT_ID, hashPassword);
  await ensureSampleGastroDiscountsForHome(prisma, TENANT_ID, gastroProfileId);
  console.log('Gastro demo user: gastro@demo.local / demo');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
