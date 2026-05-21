/**
 * Probe admin gastro discount API routes (dev only).
 * Run: pnpm --filter api run debug:admin-api -- --profile-id <id> [--email <user>]
 *
 * Requires API running. Uses JWT if SMOKE_USER_EMAIL/PASSWORD set, else X-Dev-User-Id for that user.
 */

import { PrismaClient } from '@prisma/client';
import { login } from './lib/smoke-auth';

const prisma = new PrismaClient();
const API = (process.env.API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--profile-id' && argv[i + 1]) out.profileId = argv[++i];
    else if (argv[i] === '--discount-id' && argv[i + 1]) out.discountId = argv[++i];
    else if (argv[i] === '--email' && argv[i + 1]) out.email = argv[++i].trim().toLowerCase();
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const profileId = args.profileId ?? process.env.DEBUG_GASTRO_PROFILE_ID;
  const discountId = args.discountId ?? process.env.DEBUG_GASTRO_DISCOUNT_ID;
  const email =
    args.email ??
    process.env.SMOKE_USER_EMAIL?.trim().toLowerCase() ??
    'felipe.e.salom@gmail.com';

  if (!profileId) {
    console.error('Missing --profile-id <gastroProfileId> (or DEBUG_GASTRO_PROFILE_ID)');
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, tenantId: true, role: true },
  });
  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }
  console.log('User:', user);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const creds = process.env.SMOKE_USER_PASSWORD
    ? await login(email, process.env.SMOKE_USER_PASSWORD)
    : null;
  if (creds?.token) {
    headers.Authorization = `Bearer ${creds.token}`;
    console.log('Auth: JWT');
  } else {
    headers['X-Dev-User-Id'] = user.id;
    console.log('Auth: X-Dev-User-Id (set SMOKE_USER_EMAIL/PASSWORD for JWT)');
  }

  const paths = [
    `/admin/gastronomicos/${profileId}/descuentos`,
    `/admin/gastronomicos/${profileId}/discounts`,
    `/admin/gastronomicos/pending-discounts?profileId=${profileId}&includeAllStatuses=true`,
  ];
  if (discountId) {
    paths.push(
      `/admin/gastronomicos/pending-discounts?profileId=${profileId}&discountId=${discountId}`,
    );
  }

  for (const path of paths) {
    const res = await fetch(`${API}${path}`, { headers });
    const text = await res.text();
    console.log(`\n${path} -> ${res.status}`);
    console.log(text.slice(0, 400));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
