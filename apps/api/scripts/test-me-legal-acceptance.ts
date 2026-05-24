/**
 * Smoke: user legal acceptance (Slice Legal Admin 6).
 * Run: pnpm --filter api run test:me-legal-acceptance
 * Requires API + DEV_AUTH or SMOKE_USER_EMAIL/PASSWORD.
 */

import { resolveSmokeAuth, smokeCredentialsHelp } from './lib/smoke-auth';

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';
const DEV_ADMIN_ID = process.env.SMOKE_DEV_USER_ID ?? 'user-admin';

const CHECKOUT_DOC = {
  key: 'purchase_refund_policy',
  title: 'Política de compra (smoke acceptance)',
  markdown: `# Política de compra smoke

Contenido de prueba para aceptación legal en checkout. Texto suficientemente largo para publicación.`,
};

function ok(msg: string) {
  console.log(`  OK ${msg}`);
}

function fail(msg: string): never {
  console.error(`  FAIL ${msg}`);
  process.exit(1);
}

function headers(auth: { headers: Record<string, string> }) {
  return { ...auth.headers, 'Content-Type': 'application/json' };
}

async function main() {
  const auth = await resolveSmokeAuth();
  if (!auth) {
    console.error(smokeCredentialsHelp());
    process.exit(1);
  }

  const adminHeaders = {
    'X-Dev-User-Id': DEV_ADMIN_ID,
    'Content-Type': 'application/json',
  };

  const draftRes = await fetch(
    `${API_BASE}/admin/legal-documents/${CHECKOUT_DOC.key}/draft`,
    {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: CHECKOUT_DOC.title,
        contentMarkdown: CHECKOUT_DOC.markdown,
      }),
    },
  );
  if (!draftRes.ok) fail(`admin draft → ${draftRes.status}`);

  const publishRes = await fetch(
    `${API_BASE}/admin/legal-documents/${CHECKOUT_DOC.key}/publish`,
    { method: 'POST', headers: adminHeaders, body: '{}' },
  );
  if (!publishRes.ok) fail(`admin publish → ${publishRes.status}`);
  ok('published purchase_refund_policy for acceptance test');

  const req1 = await fetch(
    `${API_BASE}/me/legal/requirements?context=CHECKOUT`,
    { headers: headers(auth) },
  );
  if (!req1.ok) fail(`GET requirements → ${req1.status}`);
  const req1Body = (await req1.json()) as {
    pending: Array<{ documentVersionId: string }>;
    allAccepted: boolean;
  };
  if (req1Body.allAccepted || req1Body.pending.length === 0) {
    fail('expected pending requirements before accept');
  }
  ok(`requirements pending (${req1Body.pending.length})`);

  const versionIds = req1Body.pending.map((p) => p.documentVersionId);
  const acceptRes = await fetch(`${API_BASE}/me/legal/accept`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ documentVersionIds: versionIds, context: 'CHECKOUT' }),
  });
  if (!acceptRes.ok) fail(`POST accept → ${acceptRes.status}`);
  ok('POST /me/legal/accept');

  const req2 = await fetch(
    `${API_BASE}/me/legal/requirements?context=CHECKOUT`,
    { headers: headers(auth) },
  );
  const req2Body = (await req2.json()) as { allAccepted: boolean; pending: unknown[] };
  if (!req2Body.allAccepted || req2Body.pending.length > 0) {
    fail('expected no pending after accept');
  }
  ok('requirements cleared after accept');

  const acceptAgain = await fetch(`${API_BASE}/me/legal/accept`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ documentVersionIds: versionIds, context: 'CHECKOUT' }),
  });
  if (!acceptAgain.ok) fail(`idempotent accept → ${acceptAgain.status}`);
  const againBody = (await acceptAgain.json()) as { alreadyAccepted: string[] };
  if (againBody.alreadyAccepted.length === 0) fail('expected alreadyAccepted ids');
  ok('idempotent accept');

  const draft2 = await fetch(
    `${API_BASE}/admin/legal-documents/${CHECKOUT_DOC.key}/draft`,
    {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: `${CHECKOUT_DOC.title} v2`,
        contentMarkdown: `${CHECKOUT_DOC.markdown}\n\nSegunda versión para re-aceptación.`,
      }),
    },
  );
  if (!draft2.ok) fail(`second draft → ${draft2.status}`);
  const pub2 = await fetch(
    `${API_BASE}/admin/legal-documents/${CHECKOUT_DOC.key}/publish`,
    { method: 'POST', headers: adminHeaders, body: '{}' },
  );
  if (!pub2.ok) fail(`second publish → ${pub2.status}`);
  ok('published v2');

  const req3 = await fetch(
    `${API_BASE}/me/legal/requirements?context=CHECKOUT`,
    { headers: headers(auth) },
  );
  const req3Body = (await req3.json()) as { pending: unknown[] };
  if (req3Body.pending.length === 0) fail('expected pending after new publish');
  ok('new version appears as pending');

  const internalPub = await fetch(
    `${API_BASE}/admin/legal-documents/support_internal_procedure/publish`,
    { method: 'POST', headers: adminHeaders, body: '{}' },
  );
  if (internalPub.ok) {
    const internalDetail = await fetch(
      `${API_BASE}/admin/legal-documents/support_internal_procedure`,
      { headers: adminHeaders },
    );
    const detail = (await internalDetail.json()) as {
      publishedVersion?: { id: string };
    };
    if (detail.publishedVersion?.id) {
      const badAccept = await fetch(`${API_BASE}/me/legal/accept`, {
        method: 'POST',
        headers: headers(auth),
        body: JSON.stringify({
          documentVersionIds: [detail.publishedVersion.id],
          context: 'PORTAL_ACCESS',
        }),
      });
      if (badAccept.status !== 400) {
        fail(`accept INTERNAL expected 400, got ${badAccept.status}`);
      }
      ok('cannot accept INTERNAL document');
    }
  }

  const history = await fetch(`${API_BASE}/me/legal/acceptances`, {
    headers: headers(auth),
  });
  if (!history.ok) fail(`GET acceptances → ${history.status}`);
  const histBody = (await history.json()) as { data: unknown[] };
  if (!Array.isArray(histBody.data) || histBody.data.length === 0) {
    fail('expected acceptance history');
  }
  ok(`GET /me/legal/acceptances (${histBody.data.length} records)`);

  console.log('\nMe legal acceptance smoke passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
