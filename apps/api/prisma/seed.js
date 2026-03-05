/**
 * Prisma seed — idempotent Tenant + Admin User
 * Uses Node crypto.scryptSync (no bcrypt)
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const seedTenant = process.env.SEED_DEFAULT_TENANT === 'true';
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!seedTenant || !adminEmail || !adminPassword) {
    console.log(
      'Seed skipped. Set SEED_DEFAULT_TENANT=true, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD to run.'
    );
    return;
  }

  const tenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    update: {},
    create: {
      id: 'default-tenant',
      name: 'Default Tenant',
      isActive: true,
    },
  });

  const passwordHash = hashPassword(adminPassword);

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: adminEmail,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('Seed complete: 1 tenant, 1 admin user');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
