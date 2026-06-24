/**
 * Smoke: commercial signup assigns User.role from profileType.
 * Run: pnpm --filter api run smoke:auth-register-role
 * Requires: API running, DB migrated.
 */

import { PrismaClient, Role } from '@prisma/client';
import { Role as SharedRole } from '@yo-te-invito/shared';
import { runSmokeScript } from './lib/smoke-runner';
import { smokeApiBase } from './lib/smoke-auth';
import { trackSmokeUserId } from './lib/smoke-cleanup';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const BASE = smokeApiBase();

type LegalRequirements = {
  canProceed?: boolean;
  required?: Array<{ documentVersionId?: string }>;
};

async function fetchSignupLegalVersionIds(profileType: string): Promise<string[]> {
  const url = `${BASE}/public/legal/requirements?tenantId=${encodeURIComponent(TENANT)}&context=SIGNUP&profileType=${encodeURIComponent(profileType)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`legal requirements ${profileType} → ${res.status}`);
  }
  const body = (await res.json()) as LegalRequirements;
  if (body.canProceed === false) {
    throw new Error(`legal requirements blocked for ${profileType}`);
  }
  return (body.required ?? [])
    .map((item) => item.documentVersionId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

async function registerProducer(email: string, password: string): Promise<{ userId: string; role: string }> {
  const legalIds = await fetchSignupLegalVersionIds('PRODUCER');
  const payload: Record<string, unknown> = {
    email,
    password,
    firstName: 'Smoke',
    lastName: 'ProducerRole',
    tenantId: TENANT,
    profileType: 'PRODUCER',
    profileData: { displayName: `Smoke Producer ${Date.now()}` },
  };
  if (legalIds.length > 0) {
    payload.signupLegalAcceptance = {
      documentVersionIds: legalIds,
      context: 'SIGNUP',
    };
  }

  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    throw new Error(`register PRODUCER → ${res.status} ${text.slice(0, 300)}`);
  }

  const data = parsed as { user?: { id?: string; role?: string } };
  if (!data.user?.id) {
    throw new Error('register PRODUCER missing user.id');
  }
  trackSmokeUserId(data.user.id);
  return { userId: data.user.id, role: data.user.role ?? '' };
}

async function main() {
  console.log('Smoke:auth-register-role —', BASE);

  const email = `smoke-producer-role-${Date.now()}@smoke.yo-te-invito.test`;
  const password = process.env.SMOKE_REGISTER_PASSWORD ?? 'SmokeTest1!';
  const prisma = new PrismaClient();

  try {
    const { userId, role: responseRole } = await registerProducer(email, password);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new Error('user not found in DB after register');

    if (user.role !== Role.PRODUCER_OWNER) {
      throw new Error(
        `expected User.role=${Role.PRODUCER_OWNER}, got ${user.role} (response.role=${responseRole})`,
      );
    }

    const producerProfile = await prisma.producerProfile.findFirst({
      where: { tenantId: TENANT, memberships: { some: { userId, status: 'ACTIVE' } } },
      select: { id: true, userId: true },
    });
    if (!producerProfile) {
      throw new Error('ProducerProfile not found for registered producer user');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
    await prisma.emailVerificationToken.deleteMany({ where: { userId } });

    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantId: TENANT }),
    });
    if (!loginRes.ok) {
      throw new Error(`login after register → ${loginRes.status}`);
    }
    const loginBody = (await loginRes.json()) as { user?: { role?: string } };
    if (loginBody.user?.role !== SharedRole.PRODUCER_OWNER) {
      throw new Error(
        `login role expected ${SharedRole.PRODUCER_OWNER}, got ${loginBody.user?.role ?? '(missing)'}`,
      );
    }

    console.log('OK register PRODUCER → User.role=PRODUCER_OWNER, ProducerProfile exists, login role correct');
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

void runSmokeScript('auth-register-role', main);
