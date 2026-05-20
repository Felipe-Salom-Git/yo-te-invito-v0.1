import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = process.env.API_BASE ?? 'http://localhost:3001';
const PROFILE_ID = 'cmpcri636000112v94mmdvsf1';

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'felipe.e.salom@gmail.com', deletedAt: null },
    select: { id: true, tenantId: true, role: true },
  });
  if (!user) {
    console.error('User not found');
    return;
  }
  console.log('User:', user);

  const headers = {
    'Content-Type': 'application/json',
    'X-Dev-User-Id': user.id,
  };

  const paths = [
    `/admin/gastronomicos/${PROFILE_ID}/descuentos`,
    `/admin/gastronomicos/${PROFILE_ID}/discounts`,
    `/admin/gastronomicos/pending-discounts?profileId=${PROFILE_ID}&includeAllStatuses=true`,
    `/admin/gastronomicos/pending-discounts?profileId=${PROFILE_ID}&discountId=cmpcydnne0001u7oy46shw8td`,
  ];

  for (const path of paths) {
    const res = await fetch(`${API}${path}`, { headers });
    const text = await res.text();
    console.log(`\n${path} -> ${res.status}`);
    console.log(text.slice(0, 250));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
