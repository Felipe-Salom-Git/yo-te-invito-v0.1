/**
 * Smoke checks for legal documents API (Slices 2–3, QA slice 8).
 * Run: pnpm --filter api run test:legal-documents
 * Requires API with DEV_AUTH_ENABLED=true (or JWT admin) and tenant-demo seeded.
 */

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.LEGAL_SEED_TENANT_ID ?? 'tenant-demo';
const DEV_ADMIN_ID = process.env.SMOKE_DEV_USER_ID ?? 'user-admin';

const SMOKE_TITLE = 'Términos de prueba (smoke legal)';
const SMOKE_MARKDOWN = `# Términos de prueba

Contenido generado por test:legal-documents para validar publicación versionada.
Este texto supera el mínimo de longitud requerido para publicar.`;

const SMOKE_MARKDOWN_V2 = `# Términos de prueba v2

Segunda versión publicada por smoke test legal. Contenido sustancial para cumplir validación.`;

function ok(msg: string) {
  console.log(`  OK ${msg}`);
}

function fail(msg: string): never {
  console.error(`  FAIL ${msg}`);
  process.exit(1);
}

function adminHeaders(): Record<string, string> {
  return {
    'X-Dev-User-Id': DEV_ADMIN_ID,
    'Content-Type': 'application/json',
  };
}

async function json<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

async function main() {
  const headers = adminHeaders();

  const listRes = await fetch(`${API_BASE}/admin/legal-documents`, { headers });
  if (!listRes.ok) {
    if (listRes.status === 401) {
      fail(
        'GET /admin/legal-documents → 401. Start API with DEV_AUTH_ENABLED=true and a valid ADMIN user for X-Dev-User-Id (SMOKE_DEV_USER_ID).',
      );
    }
    fail(`GET /admin/legal-documents → ${listRes.status}`);
  }
  const list = await json<{ data: unknown[] }>(listRes);
  if (!Array.isArray(list.data) || list.data.length < 10) {
    fail(`expected ≥10 documents, got ${list.data?.length ?? 0}`);
  }
  ok(`GET /admin/legal-documents (${list.data.length} items)`);

  const publicBefore = await fetch(
    `${API_BASE}/public/legal/terminos?tenantId=${encodeURIComponent(TENANT_ID)}`,
  );
  if (publicBefore.status !== 404) {
    fail(`public before publish expected 404, got ${publicBefore.status}`);
  }
  ok('GET /public/legal/terminos → 404 before publish');

  const draftRes = await fetch(`${API_BASE}/admin/legal-documents/terms_general/draft`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: SMOKE_TITLE,
      contentMarkdown: SMOKE_MARKDOWN,
      summary: 'Smoke test draft',
    }),
  });
  if (!draftRes.ok) fail(`POST draft → ${draftRes.status}`);
  const afterDraft = await json<{
    draftVersion?: { status: string };
    publishedVersion?: { status: string } | null;
  }>(draftRes);
  if (afterDraft.draftVersion?.status !== 'DRAFT') fail('draft not DRAFT after save');
  ok('POST /admin/legal-documents/terms_general/draft');

  const publicMid = await fetch(
    `${API_BASE}/public/legal/terminos?tenantId=${encodeURIComponent(TENANT_ID)}`,
  );
  if (publicMid.status !== 404) {
    fail(`public with draft only expected 404, got ${publicMid.status}`);
  }
  ok('GET /public/legal/terminos → 404 with draft only');

  const publishPlaceholder = await fetch(
    `${API_BASE}/admin/legal-documents/privacy_policy/publish`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    },
  );
  if (publishPlaceholder.status !== 400) {
    fail(`publish placeholder expected 400, got ${publishPlaceholder.status}`);
  }
  ok('POST publish placeholder → 400');

  const publishRes = await fetch(`${API_BASE}/admin/legal-documents/terms_general/publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (!publishRes.ok) fail(`POST publish → ${publishRes.status}`);
  const afterPublish = await json<{
    publishedVersion?: { status: string; contentMarkdown?: string };
    draftVersion?: unknown;
  }>(publishRes);
  if (afterPublish.publishedVersion?.status !== 'PUBLISHED') {
    fail('published version not PUBLISHED');
  }
  if (!afterPublish.publishedVersion?.contentMarkdown?.includes('smoke test')) {
    fail('published content mismatch');
  }
  ok('POST /admin/legal-documents/terms_general/publish');

  const publicAfter = await fetch(
    `${API_BASE}/public/legal/terminos?tenantId=${encodeURIComponent(TENANT_ID)}`,
  );
  if (!publicAfter.ok) fail(`GET public after publish → ${publicAfter.status}`);
  const publicBody = await json<{ contentMarkdown?: string; version?: string }>(publicAfter);
  if (!publicBody.contentMarkdown?.includes('smoke test')) {
    fail('public content mismatch after publish');
  }
  ok(`GET /public/legal/terminos → 200 (version ${publicBody.version ?? '?'})`);

  const draft2Res = await fetch(`${API_BASE}/admin/legal-documents/terms_general/draft`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: `${SMOKE_TITLE} v2`,
      contentMarkdown: SMOKE_MARKDOWN_V2,
      summary: 'Smoke v2 draft',
    }),
  });
  if (!draft2Res.ok) fail(`POST second draft → ${draft2Res.status}`);
  ok('POST second draft (new version row)');

  const publish2Res = await fetch(`${API_BASE}/admin/legal-documents/terms_general/publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (!publish2Res.ok) fail(`POST second publish → ${publish2Res.status}`);
  ok('POST second publish');

  const versionsRes = await fetch(
    `${API_BASE}/admin/legal-documents/terms_general/versions`,
    { headers },
  );
  if (!versionsRes.ok) fail(`GET versions → ${versionsRes.status}`);
  const versionsPayload = await json<{
    data: Array<{ status: string; version: string }>;
  }>(versionsRes);
  const published = versionsPayload.data.filter((v) => v.status === 'PUBLISHED');
  const archived = versionsPayload.data.filter((v) => v.status === 'ARCHIVED');
  if (published.length !== 1) {
    fail(`expected 1 PUBLISHED version, got ${published.length}`);
  }
  if (archived.length < 1) {
    fail(`expected ≥1 ARCHIVED version, got ${archived.length}`);
  }
  ok('version history: single PUBLISHED, previous ARCHIVED');

  const internalDraft = await fetch(
    `${API_BASE}/admin/legal-documents/support_internal_procedure/draft`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Procedimiento interno (smoke)',
        contentMarkdown: `# Soporte interno\n\nContenido de prueba para documento INTERNAL publicado solo en admin.`,
      }),
    },
  );
  if (!internalDraft.ok) fail(`internal draft → ${internalDraft.status}`);

  const internalPublish = await fetch(
    `${API_BASE}/admin/legal-documents/support_internal_procedure/publish`,
    { method: 'POST', headers, body: JSON.stringify({}) },
  );
  if (!internalPublish.ok) fail(`internal publish → ${internalPublish.status}`);
  ok('INTERNAL document published (admin only)');

  const internalPublic = await fetch(
    `${API_BASE}/public/legal/soporte?tenantId=${encodeURIComponent(TENANT_ID)}`,
  );
  if (internalPublic.status !== 404) {
    fail(`public internal slug expected 404, got ${internalPublic.status}`);
  }
  ok('GET /public/legal/soporte → 404 even when INTERNAL has published version');

  const requirementsRes = await fetch(
    `${API_BASE}/public/legal/requirements?tenantId=${encodeURIComponent(TENANT_ID)}&context=SIGNUP&profileType=USER`,
  );
  if (!requirementsRes.ok) fail(`GET public requirements → ${requirementsRes.status}`);
  const requirementsBody = await json<{
    required: Array<{ documentVersionId: string; documentKey: string }>;
  }>(requirementsRes);
  if (!Array.isArray(requirementsBody.required)) {
    fail('public requirements missing required array');
  }
  for (const item of requirementsBody.required) {
    if (!item.documentVersionId || item.documentVersionId.length < 8) {
      fail('public requirements item missing documentVersionId');
    }
  }
  ok(`GET /public/legal/requirements SIGNUP (${requirementsBody.required.length} docs)`);

  const noAuthAdmin = await fetch(`${API_BASE}/admin/legal-documents`);
  if (noAuthAdmin.status !== 401) {
    fail(`admin without auth expected 401, got ${noAuthAdmin.status}`);
  }
  ok('GET /admin/legal-documents without auth → 401');

  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `smoke-legal-rbac-${Date.now()}@smoke.yo-te-invito.test`,
      password: 'SmokeTest1!',
      firstName: 'Smoke',
      lastName: 'LegalRBAC',
      tenantId: TENANT_ID,
      profileType: 'USER',
    }),
  });
  if (!registerRes.ok) fail(`register for RBAC → ${registerRes.status}`);
  const registered = await json<{ token?: string }>(registerRes);
  if (!registered.token) fail('register missing token');

  const userAdminList = await fetch(`${API_BASE}/admin/legal-documents`, {
    headers: { Authorization: `Bearer ${registered.token}` },
  });
  if (userAdminList.status !== 403) {
    fail(`non-admin admin list expected 403, got ${userAdminList.status}`);
  }
  ok('non-ADMIN user → GET /admin/legal-documents 403');

  const seedSecond = await fetch(`${API_BASE}/admin/legal-documents`, { headers });
  if (!seedSecond.ok) fail(`idempotent admin list → ${seedSecond.status}`);
  ok('seed/admin list idempotent (re-fetch OK)');

  console.log('\nLegal documents smoke passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
