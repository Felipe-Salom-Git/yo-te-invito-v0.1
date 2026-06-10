/**
 * V3.1 Etapa 11 — EVENT_PUBLICATION legal acceptance smoke.
 * Run: pnpm --filter api run smoke:v31-event-publication-legal
 */
import { PrismaClient } from '@prisma/client';

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.LEGAL_SEED_TENANT_ID ?? 'tenant-demo';
const DEV_PRODUCER_ID = process.env.SMOKE_DEV_USER_ID ?? 'user-producer';

const SMOKE_MARKDOWN = `# Condiciones productoras (smoke V3.1)

Texto de prueba para validar aceptación EVENT_PUBLICATION por evento.`;

function ok(msg: string) {
  console.log(`  OK ${msg}`);
}

function fail(msg: string): never {
  console.error(`  FAIL ${msg}`);
  process.exit(1);
}

function producerHeaders(): Record<string, string> {
  return {
    'X-Dev-User-Id': DEV_PRODUCER_ID,
    'Content-Type': 'application/json',
  };
}

function adminHeaders(): Record<string, string> {
  return {
    'X-Dev-User-Id': process.env.SMOKE_ADMIN_USER_ID ?? 'user-admin',
    'Content-Type': 'application/json',
  };
}

async function json<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const producer = await prisma.user.findFirst({
      where: { tenantId: TENANT_ID, deletedAt: null, role: { in: ['PRODUCER_OWNER', 'ADMIN'] } },
      select: { id: true },
    });
    if (!producer) {
      fail('No producer user in DB — run user:restore-master or seed');
    }

    const headers = { 'X-Dev-User-Id': producer.id, 'Content-Type': 'application/json' };

    const draftRes = await fetch(`${API_BASE}/admin/legal-documents/producer_terms/draft`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        title: 'Condiciones productoras (smoke)',
        contentMarkdown: SMOKE_MARKDOWN,
      }),
    });
    if (!draftRes.ok && draftRes.status !== 401) {
      fail(`POST producer_terms draft → ${draftRes.status}`);
    }

    const publishRes = await fetch(`${API_BASE}/admin/legal-documents/producer_terms/publish`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({}),
    });
    if (!publishRes.ok && publishRes.status !== 401) {
      fail(`POST producer_terms publish → ${publishRes.status}`);
    }
    ok('producer_terms draft/publish attempted (skip if 401 without admin dev user)');

    const event = await prisma.event.create({
      data: {
        tenantId: TENANT_ID,
        producerId: producer.id,
        title: `[smoke] event publication legal ${Date.now()}`,
        startAt: new Date(Date.now() + 86400000),
        status: 'DRAFT',
        category: 'event',
      },
      select: { id: true },
    });
    ok(`created draft event ${event.id}`);

    const pendingBlocked = await fetch(`${API_BASE}/producer/events/${event.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'PENDING' }),
    });
    const pendingBody = await json<{ code?: string }>(pendingBlocked);
    if (pendingBlocked.ok) {
      fail('PATCH → PENDING should be blocked without acceptance');
    }
    if (
      pendingBody.code !== 'LEGAL_ACCEPTANCE_REQUIRED' &&
      pendingBody.code !== 'LEGAL_DOCUMENT_NOT_PUBLISHED'
    ) {
      fail(`expected LEGAL_* error, got ${pendingBody.code ?? pendingBlocked.status}`);
    }
    ok(`PATCH → PENDING blocked (${pendingBody.code})`);

    const statusBefore = await fetch(
      `${API_BASE}/producer/events/${event.id}/legal/publication-terms`,
      { headers },
    );
    if (!statusBefore.ok) fail(`GET publication-terms → ${statusBefore.status}`);
    const statusJson = await json<{ documentPublished: boolean; accepted: boolean }>(statusBefore);
    ok(`GET publication-terms (published=${statusJson.documentPublished})`);

    if (statusJson.documentPublished) {
      const acceptRes = await fetch(
        `${API_BASE}/producer/events/${event.id}/legal/accept-publication-terms`,
        { method: 'POST', headers, body: '{}' },
      );
      if (!acceptRes.ok) fail(`POST accept-publication-terms → ${acceptRes.status}`);
      ok('POST accept-publication-terms');

      const acceptAgain = await fetch(
        `${API_BASE}/producer/events/${event.id}/legal/accept-publication-terms`,
        { method: 'POST', headers, body: '{}' },
      );
      if (!acceptAgain.ok) fail(`idempotent accept → ${acceptAgain.status}`);
      const againJson = await json<{ alreadyAccepted: boolean }>(acceptAgain);
      if (!againJson.alreadyAccepted) fail('second accept should be idempotent');
      ok('accept idempotent');

      const pendingOk = await fetch(`${API_BASE}/producer/events/${event.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'PENDING' }),
      });
      if (!pendingOk.ok) fail(`PATCH → PENDING after accept → ${pendingOk.status}`);
      ok('PATCH → PENDING allowed after acceptance');
    } else {
      ok('skip accept flow — producer_terms not published in this environment');
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { deletedAt: new Date() },
    });
    ok('cleanup smoke event');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
