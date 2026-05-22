/**
 * Smoke — Referidos V2 (propuestas, comisión, solicitud de pago manual).
 * Run: pnpm --filter api run smoke:referrals
 *
 * Requires API :3001, DB migrated, and role-specific credentials (no @demo.local):
 *   SMOKE_PRODUCER_EMAIL + password (SMOKE_PRODUCER_PASSWORD or SMOKE_USER_PASSWORD)
 *   SMOKE_REFERRER_EMAIL + password (SMOKE_REFERRER_PASSWORD or SMOKE_USER_PASSWORD)
 *
 * Optional:
 *   SMOKE_EVENT_ID — APPROVED event with ticket types (else first APPROVED from producer list)
 *   SMOKE_REFERRER_PROFILE_ID — referrer profile cuid (else first ACTIVE association)
 *   SMOKE_TENANT_ID — default tenant-demo
 *
 * Creates real orders/commissions when event + association exist; standard smoke:cleanup runs after.
 */

import {
  getSmokeCredentials,
  login,
  smokeApiBase,
  smokeCredentialsHelp,
} from './lib/smoke-auth';
import { smokeTestComment } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';

const BASE = smokeApiBase();
const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';

const ROLE_EMAIL_ENV: Record<string, string> = {
  producer: 'SMOKE_PRODUCER_EMAIL',
  referrer: 'SMOKE_REFERRER_EMAIL',
};

async function loginForRole(
  role: keyof typeof ROLE_EMAIL_ENV,
): Promise<{ token: string; userId: string; email: string } | null> {
  const email = process.env[ROLE_EMAIL_ENV[role]]?.trim().toLowerCase();
  const password =
    process.env[`SMOKE_${role.toUpperCase()}_PASSWORD`] ?? process.env.SMOKE_USER_PASSWORD;
  if (!email || !password) return null;
  const session = await login(email, password);
  if (!session) return null;
  return { ...session, email };
}

type Result = { name: string; ok: boolean; skip?: boolean; err?: string };

const results: Result[] = [];

function pass(name: string) {
  results.push({ name, ok: true });
  console.log(`  ✓ ${name}`);
}

function fail(name: string, err: string) {
  results.push({ name, ok: false, err });
  console.log(`  ✗ ${name} — ${err}`);
}

function skip(name: string, reason: string) {
  results.push({ name, ok: true, skip: true, err: reason });
  console.log(`  ⊘ ${name} (skip: ${reason})`);
}

async function api(
  path: string,
  opts?: {
    method?: string;
    query?: Record<string, string>;
    body?: unknown;
    token?: string | null;
  },
) {
  const url = new URL(path.startsWith('/') ? path.slice(1) : path, BASE);
  if (opts?.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(url.toString(), {
    method: opts?.method ?? 'GET',
    headers,
    body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

function printSummary(): number {
  const failed = results.filter((r) => !r.ok);
  const skipped = results.filter((r) => r.skip);
  const passed = results.filter((r) => r.ok && !r.skip);
  console.log(
    `\n${passed.length} passed, ${skipped.length} skipped, ${failed.length} failed (${results.length} checks)`,
  );
  for (const r of failed) {
    console.log(`  FAIL: ${r.name}${r.err ? ` — ${r.err}` : ''}`);
  }
  return failed.length > 0 ? 1 : 0;
}

async function main() {
  if (!getSmokeCredentials()) {
    console.error(smokeCredentialsHelp());
    console.error(
      '\nReferrals smoke also needs SMOKE_PRODUCER_EMAIL and SMOKE_REFERRER_EMAIL (passwords via SMOKE_USER_PASSWORD or role-specific).',
    );
    process.exit(1);
  }

  console.log('Referidos V2 smoke —', BASE);
  console.log(`  Tenant: ${TENANT}`);

  const producer = await loginForRole('producer');
  const referrer = await loginForRole('referrer');

  if (!producer) {
    skip('producer auth', 'set SMOKE_PRODUCER_EMAIL + password');
  } else {
    pass(`producer login (${producer.email})`);
  }

  if (!referrer) {
    skip('referrer auth', 'set SMOKE_REFERRER_EMAIL + password');
  } else {
    pass(`referrer login (${referrer.email})`);
  }

  if (!producer || !referrer) {
    return printSummary();
  }

  // ── Referrer profile ───────────────────────────────────────────────────
  const refMe = await api('/referrer/me', { token: referrer.token });
  if (!refMe.ok) {
    fail('GET /referrer/me', `status=${refMe.status}`);
    return printSummary();
  }
  const referrerProfileId =
    process.env.SMOKE_REFERRER_PROFILE_ID?.trim() ||
    (refMe.data as { id?: string })?.id;
  if (!referrerProfileId) {
    fail('referrer profile id', 'missing');
    return printSummary();
  }
  pass(`referrer profile ${referrerProfileId}`);

  // ── Producer ↔ referrer association ────────────────────────────────────
  const associated = await api('/producer/referrers/associated', { token: producer.token });
  if (!associated.ok) {
    fail('GET /producer/referrers/associated', `status=${associated.status}`);
    return printSummary();
  }
  const relationships = associated.data as Array<{
    status?: string;
    referrerProfileId?: string;
    referrerProfile?: { id?: string };
  }>;
  const activeRel = relationships.find(
    (r) =>
      r.status === 'ACTIVE' &&
      (r.referrerProfileId === referrerProfileId ||
        r.referrerProfile?.id === referrerProfileId),
  );
  if (!activeRel) {
    skip(
      'ACTIVE producer↔referrer relationship',
      'associate producer and referrer in DB before full E2E',
    );
  } else {
    pass('ACTIVE producer↔referrer relationship');
  }

  // ── Event with ticket types ─────────────────────────────────────────────
  let eventId = process.env.SMOKE_EVENT_ID?.trim();
  if (!eventId) {
    const events = await api('/producer/events?status=APPROVED&limit=20', {
      token: producer.token,
    });
    if (events.ok) {
      const list = events.data as { data?: Array<{ id: string; status?: string }> };
      eventId = list.data?.find((e) => e.status === 'APPROVED')?.id ?? list.data?.[0]?.id;
    }
  }
  if (!eventId) {
    skip('event + order flow', 'set SMOKE_EVENT_ID or publish an APPROVED event');
    return printSummary();
  }
  pass(`event ${eventId}`);

  const ticketTypes = await api(`/public/events/${eventId}/ticket-types`, {
    query: { tenantId: TENANT },
  });
  const types = Array.isArray(ticketTypes.data)
    ? (ticketTypes.data as Array<{ id: string }>)
    : ((ticketTypes.data as { ticketTypes?: Array<{ id: string }> })?.ticketTypes ?? []);
  const ticketTypeId = types[0]?.id;
  if (!ticketTypes.ok || !ticketTypeId) {
    skip('order + commission', 'no public ticket types for event');
    return printSummary();
  }

  // ── Proposal → accept → link ────────────────────────────────────────────
  let referralCode: string | null = null;
  let proposalId: string | null = null;

  const createProposal = await api('/producer/referrals/proposals', {
    method: 'POST',
    token: producer.token,
    body: {
      referrerProfileId,
      eventId,
      commissionType: 'PERCENTAGE',
      commissionValue: 10,
      message: smokeTestComment('referrals-v2-proposal'),
    },
  });

  if (createProposal.ok) {
    proposalId = (createProposal.data as { id?: string })?.id ?? null;
    pass('POST /producer/referrals/proposals');
  } else if (createProposal.status === 409) {
    skip('create proposal', 'active agreement or blocking proposal exists — using existing flow');
    const refProposals = await api('/referrer/proposals', { token: referrer.token });
    const proposals = (refProposals.data as { proposals?: Array<{ id: string; eventId: string; status: string }> })
      ?.proposals;
    const accepted = proposals?.find(
      (p) => p.eventId === eventId && (p.status === 'ACCEPTED' || p.status === 'PENDING'),
    );
    proposalId = accepted?.id ?? null;
  } else {
    fail('POST /producer/referrals/proposals', `status=${createProposal.status}`);
  }

  if (proposalId) {
    const accept = await api(`/referrer/proposals/${proposalId}/accept`, {
      method: 'POST',
      token: referrer.token,
    });
    if (accept.ok) {
      const agreement = accept.data as {
        agreement?: { referralLink?: { code?: string } };
      };
      referralCode = agreement.agreement?.referralLink?.code ?? null;
      pass('POST /referrer/proposals/:id/accept');
    } else if (accept.status === 400 || accept.status === 409) {
      const dash = await api('/referrer/me/dashboard', { token: referrer.token });
      const links = (dash.data as { metrics?: { saleLinks?: Array<{ code?: string; eventId?: string }> } })
        ?.metrics?.saleLinks;
      referralCode =
        links?.find((l) => l.eventId === eventId)?.code ?? links?.[0]?.code ?? null;
      skip('accept proposal', `status=${accept.status}; link from dashboard if any`);
    } else {
      fail('POST /referrer/proposals/:id/accept', `status=${accept.status}`);
    }
  }

  const listProducerProposals = await api('/producer/referrals/proposals', {
    token: producer.token,
  });
  if (listProducerProposals.ok) pass('GET /producer/referrals/proposals');
  else fail('GET /producer/referrals/proposals', `status=${listProducerProposals.status}`);

  const refMetrics = await api('/referrer/metrics', { token: referrer.token });
  if (refMetrics.ok) pass('GET /referrer/metrics');
  else fail('GET /referrer/metrics', `status=${refMetrics.status}`);

  const prodMetrics = await api('/producer/referrals/metrics', { token: producer.token });
  if (prodMetrics.ok) pass('GET /producer/referrals/metrics');
  else fail('GET /producer/referrals/metrics', `status=${prodMetrics.status}`);

  if (!referralCode || !activeRel) {
    skip('order → commission → payment request', 'missing link or ACTIVE relationship');
    return printSummary();
  }
  pass(`referral link code ${referralCode}`);

  // ── Order with attribution + demo payment ─────────────────────────────
  const buyerEmail = `smoke-referral-buyer-${Date.now()}@smoke.yo-te-invito.test`;
  const createOrder = await api('/public/orders', {
    method: 'POST',
    query: { tenantId: TENANT },
    body: {
      eventId,
      referralCode,
      buyer: {
        email: buyerEmail,
        firstName: 'Smoke',
        lastName: 'Referral',
      },
      items: [{ ticketTypeId, quantity: 1 }],
    },
  });
  if (!createOrder.ok) {
    fail('POST /public/orders (referral)', `status=${createOrder.status}`);
    return printSummary();
  }
  const orderId = (createOrder.data as { id?: string })?.id;
  if (!orderId) {
    fail('order id', 'missing in response');
    return printSummary();
  }
  pass(`POST /public/orders → ${orderId}`);

  const createPay = await api(`/public/orders/${orderId}/payments`, {
    method: 'POST',
    query: { tenantId: TENANT },
    body: { provider: 'DEMO' },
  });
  const paymentId = (createPay.data as { paymentId?: string })?.paymentId;
  if (!createPay.ok || !paymentId) {
    fail('POST /public/orders/:id/payments', `status=${createPay.status}`);
    return printSummary();
  }

  const confirm = await api(`/public/payments/${paymentId}/demo-confirm`, {
    method: 'POST',
    query: { tenantId: TENANT },
  });
  if (!confirm.ok) {
    fail('POST /public/payments/:id/demo-confirm', `status=${confirm.status}`);
    return printSummary();
  }
  pass('demo-confirm → PAID');

  // ── Eligible commission + payment request ───────────────────────────────
  const eligible = await api('/referrer/payment-requests/eligible-commissions', {
    token: referrer.token,
  });
  if (!eligible.ok) {
    fail('GET eligible-commissions', `status=${eligible.status}`);
    return printSummary();
  }
  const commissions = (
    eligible.data as { commissions?: Array<{ id: string; orderId?: string | null; status?: string }> }
  )?.commissions ?? [];
  const commission = commissions.find((c) => c.orderId === orderId) ?? commissions[0];
  if (!commission?.id) {
    skip('commission row', 'no CONFIRMED commission yet (agreement/link timing)');
    return printSummary();
  }
  if (commission.status && commission.status !== 'CONFIRMED') {
    fail('commission status', commission.status);
    return printSummary();
  }
  pass(`commission ${commission.id} CONFIRMED`);

  const createReq = await api('/referrer/payment-requests', {
    method: 'POST',
    token: referrer.token,
    body: { commissionIds: [commission.id], message: smokeTestComment('payment-request') },
  });
  if (!createReq.ok) {
    fail('POST /referrer/payment-requests', `status=${createReq.status}`);
    return printSummary();
  }
  const paymentRequestId = (createReq.data as { id?: string })?.id;
  pass('POST /referrer/payment-requests');

  const dupReq = await api('/referrer/payment-requests', {
    method: 'POST',
    token: referrer.token,
    body: { commissionIds: [commission.id] },
  });
  if (dupReq.status === 409) pass('duplicate payment request blocked (409)');
  else fail('duplicate payment request', `expected 409, got ${dupReq.status}`);

  if (!paymentRequestId) {
    fail('payment request id', 'missing');
    return printSummary();
  }

  const prodList = await api('/producer/referrals/payment-requests', {
    token: producer.token,
  });
  if (!prodList.ok) {
    fail('GET /producer/referrals/payment-requests', `status=${prodList.status}`);
    return printSummary();
  }
  pass('GET /producer/referrals/payment-requests');

  const inReview = await api(`/producer/referrals/payment-requests/${paymentRequestId}/mark-in-review`, {
    method: 'POST',
    token: producer.token,
  });
  if (inReview.ok) pass('POST mark-in-review');
  else fail('POST mark-in-review', `status=${inReview.status}`);

  const markPaid = await api(`/producer/referrals/payment-requests/${paymentRequestId}/mark-paid`, {
    method: 'POST',
    token: producer.token,
  });
  if (markPaid.ok) pass('POST mark-paid (external settlement register)');
  else fail('POST mark-paid', `status=${markPaid.status}`);

  const paidDto = markPaid.data as {
    status?: string;
    commissions?: Array<{ status?: string }>;
  };
  if (paidDto.status === 'PAID') pass('payment request status PAID');
  else fail('payment request final status', paidDto.status ?? 'unknown');

  const marked = paidDto.commissions?.every(
    (c) => c.status === 'MARKED_AS_PAID' || c.status === 'PAID',
  );
  if (marked) pass('commissions MARKED_AS_PAID');
  else fail('commission statuses after mark-paid', JSON.stringify(paidDto.commissions?.map((c) => c.status)));

  // Foreign producer cannot mark another producer's request (404)
  const otherProducer = process.env.SMOKE_SECOND_PRODUCER_EMAIL?.trim().toLowerCase();
  const otherPass =
    process.env.SMOKE_SECOND_PRODUCER_PASSWORD ?? process.env.SMOKE_USER_PASSWORD;
  if (otherProducer && otherPass) {
    const other = await login(otherProducer, otherPass);
    if (other) {
      const foreign = await api(
        `/producer/referrals/payment-requests/${paymentRequestId}/mark-paid`,
        { method: 'POST', token: other.token },
      );
      if (foreign.status === 404 || foreign.status === 403) {
        pass('foreign producer cannot mark-paid (404/403)');
      } else {
        fail('foreign mark-paid', `expected 404/403, got ${foreign.status}`);
      }
    }
  } else {
    skip('foreign producer mark-paid', 'optional SMOKE_SECOND_PRODUCER_EMAIL');
  }

  return printSummary();
}

runSmokeScript('smoke:referrals', main);
