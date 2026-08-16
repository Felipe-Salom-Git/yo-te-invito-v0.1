/**
 * Auth verification resend: util + Prisma integration (token replace, email enqueue).
 * Run: pnpm --filter api run test:auth-resend-verification
 */

import { PrismaClient } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';
import {
  AUTH_RESEND_VERIFICATION_USER_MESSAGES,
  AUTH_VERIFY_EMAIL_USER_MESSAGES,
} from '@yo-te-invito/shared';
import {
  SlidingWindowRateLimiter,
  createEmailVerificationToken,
  genericResendAcceptedMessage,
  resendVerificationAction,
  shouldIssueVerificationEmail,
} from '../src/auth/auth-verify-email.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

type Enqueued = {
  templateId: string;
  to: string;
  variables: Record<string, unknown>;
};

const tokens = new Set<string>();
for (let i = 0; i < 20; i += 1) {
  tokens.add(createEmailVerificationToken());
}
assert(tokens.size === 20, 'verification tokens are unique');
assert(
  [...tokens].every((t) => t.length === 64 && /^[a-f0-9]+$/.test(t)),
  'tokens are hex 32 bytes',
);

assert(!shouldIssueVerificationEmail(null), 'unknown user → do not issue');
assert(
  !shouldIssueVerificationEmail({ emailVerified: new Date() }),
  'verified → do not issue',
);
assert(
  shouldIssueVerificationEmail({ emailVerified: null }),
  'unverified → issue',
);

assert(
  genericResendAcceptedMessage() === AUTH_RESEND_VERIFICATION_USER_MESSAGES.accepted,
  'generic accepted message',
);
assert(
  AUTH_VERIFY_EMAIL_USER_MESSAGES.invalidOrExpired.includes('venció'),
  'expired/invalid copy',
);

let clock = 1_000;
const limiter = new SlidingWindowRateLimiter(3, 15 * 60 * 1000, () => clock);
assert(limiter.consume('a').ok, 'rate 1/3 ok');
assert(limiter.consume('a').ok, 'rate 2/3 ok');
assert(limiter.consume('a').ok, 'rate 3/3 ok');
assert(!limiter.consume('a').ok, 'rate 4/3 blocked');
assert(limiter.consume('b').ok, 'other key not blocked');
clock += 15 * 60 * 1000;
assert(limiter.consume('a').ok, 'window reset allows again');

assert(resendVerificationAction(null) === 'noop', 'policy: unknown → noop');
assert(
  resendVerificationAction({ emailVerified: new Date() }) === 'noop',
  'policy: verified → noop',
);
assert(
  resendVerificationAction({ emailVerified: null }) === 'issue',
  'policy: unverified → issue (invalidate previous token)',
);

const previousSim = createEmailVerificationToken();
const nextSim = createEmailVerificationToken();
assert(previousSim !== nextSim, 'simulated replace: nuevo token != token anterior');

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.log('SKIP prisma integration: DATABASE_URL missing');
  console.log('OK: auth-resend-verification util passed');
  process.exit(0);
}

const prisma = new PrismaClient();
const sent: Enqueued[] = [];
const emailQueue = {
  enqueueTemplate: async (params: Enqueued) => {
    sent.push(params);
  },
  enqueue: async () => undefined,
};

const TENANT = 'tenant-demo';
const stamp = Date.now();
const unverifiedEmail = `resend-unverified-${stamp}@smoke.yo-te-invito.test`;
const verifiedEmail = `resend-verified-${stamp}@smoke.yo-te-invito.test`;
const unknownEmail = `resend-unknown-${stamp}@smoke.yo-te-invito.test`;

async function cleanup(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.emailVerificationToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

async function runIntegration() {
  try {
    await prisma.$connect();
  } catch {
    console.log('SKIP prisma integration: database unreachable');
    await prisma.$disconnect().catch(() => undefined);
    return;
  }

  const createdIds: string[] = [];
  try {
    const unverified = await prisma.user.create({
      data: {
        tenantId: TENANT,
        email: unverifiedEmail,
        passwordHash: '00:00',
        firstName: 'Resend',
        lastName: 'Unverified',
        role: 'USER',
        status: 'ACTIVE',
      },
    });
    createdIds.push(unverified.id);

    const previousToken = 'a'.repeat(64);
    await prisma.emailVerificationToken.create({
      data: {
        userId: unverified.id,
        token: previousToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verified = await prisma.user.create({
      data: {
        tenantId: TENANT,
        email: verifiedEmail,
        passwordHash: '00:00',
        firstName: 'Resend',
        lastName: 'Verified',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });
    createdIds.push(verified.id);

    const auth = new AuthService(
      prisma as never,
      {} as never,
      emailQueue as never,
      {} as never,
      {} as never,
    );

    const unverifiedRes = await auth.resendVerificationEmail({
      email: unverifiedEmail,
      tenantId: TENANT,
    });
    assert(
      unverifiedRes.message === AUTH_RESEND_VERIFICATION_USER_MESSAGES.accepted,
      'unverified resend → generic message',
    );

    const current = await prisma.emailVerificationToken.findUnique({
      where: { userId: unverified.id },
    });
    assert(Boolean(current), 'unverified + resend → new token row');
    assert(current!.token !== previousToken, 'nuevo token != token anterior');

    const oldRow = await prisma.emailVerificationToken.findUnique({
      where: { token: previousToken },
    });
    assert(!oldRow, 'token anterior inválido (eliminado)');

    const verifyMails = sent.filter((e) => e.templateId === 'AUTH_VERIFY_EMAIL');
    assert(verifyMails.length === 1, 'unverified → AUTH_VERIFY_EMAIL enviado');
    assert(verifyMails[0]!.to === unverifiedEmail, 'email sent to unverified user');
    const verifyUrl = String(verifyMails[0]!.variables.verifyUrl ?? '');
    assert(verifyUrl.includes('/verify-email?token='), 'verifyUrl uses canonical path');
    assert(!verifyUrl.includes(previousToken), 'verifyUrl uses new token');

    const previousVerify = await auth
      .verifyEmail(previousToken)
      .then(() => 'ok')
      .catch((err: { message?: string }) => err?.message ?? 'fail');
    assert(previousVerify !== 'ok', 'token anterior no verifica');

    const newVerify = await auth.verifyEmail(current!.token);
    assert(newVerify.verified === true, 'token nuevo válido');

    const afterVerify = await prisma.user.findUnique({
      where: { id: unverified.id },
      select: { emailVerified: true },
    });
    assert(Boolean(afterVerify?.emailVerified), 'cuenta queda verificada');

    sent.length = 0;
    const verifiedRes = await auth.resendVerificationEmail({
      email: verifiedEmail,
      tenantId: TENANT,
    });
    assert(
      verifiedRes.message === AUTH_RESEND_VERIFICATION_USER_MESSAGES.accepted,
      'verified + resend → generic message',
    );
    const verifiedToken = await prisma.emailVerificationToken.findUnique({
      where: { userId: verified.id },
    });
    assert(!verifiedToken, 'verified + resend → no new token');
    assert(
      sent.filter((e) => e.templateId === 'AUTH_VERIFY_EMAIL').length === 0,
      'verified → no enviado',
    );

    sent.length = 0;
    const unknownRes = await auth.resendVerificationEmail({
      email: unknownEmail,
      tenantId: TENANT,
    });
    assert(
      unknownRes.message === AUTH_RESEND_VERIFICATION_USER_MESSAGES.accepted,
      'unknown email → generic message',
    );
    assert(sent.length === 0, 'unknown → no enviado');
  } finally {
    await cleanup(createdIds);
    await prisma.$disconnect();
  }
}

runIntegration()
  .then(() => {
    console.log('OK: auth-resend-verification matrix passed');
  })
  .catch((err) => {
    console.error('FAIL: prisma integration', err);
    process.exit(1);
  });
