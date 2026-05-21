/**
 * Smoke: seguir productoras + recomendaciones
 * API :3001, migración user_producer_follows
 */
import { resolveSmokeAuth, smokeApiUrl } from './lib/smoke-auth';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = 'tenant-demo';

async function main() {
  let passed = 0;
  let failed = 0;
  const ok = (m: string) => {
    passed++;
    console.log(`  ✓ ${m}`);
  };
  const fail = (m: string, detail?: string) => {
    failed++;
    console.log(`  ✗ ${m}${detail ? ` — ${detail}` : ''}`);
  };

  const auth = await resolveSmokeAuth();
  console.log('Producer follows smoke —', smokeApiUrl(''));
  console.log('  Auth:', auth.label);
  const headers = { ...auth.headers, 'Content-Type': 'application/json' };

  const producersRes = await fetch(smokeApiUrl('/public/producers?limit=5'));
  if (!producersRes.ok) {
    fail('list producers', String(producersRes.status));
    process.exit(1);
  }
  const producersJson = (await producersRes.json()) as {
    producers?: Array<{ id: string }>;
  };
  const producerId = producersJson.producers?.[0]?.id;
  if (!producerId) {
    fail('no ACTIVE producer in tenant');
    process.exit(1);
  }
  ok(`producer ${producerId}`);

  const createRes = await fetch(smokeApiUrl('/me/producer-follows'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      producerProfileId: producerId,
      tenantId: TENANT,
    }),
  });
  if (!createRes.ok && createRes.status !== 409) {
    fail('POST /me/producer-follows', String(createRes.status));
  } else {
    ok('POST /me/producer-follows');
  }

  const listRes = await fetch(smokeApiUrl('/me/producer-follows'), { headers });
  let followRow: { id: string } | undefined;
  if (listRes.ok) {
    const j = (await listRes.json()) as { follows?: { id: string }[] };
    followRow = j.follows?.[0];
    ok(`GET /me/producer-follows (${j.follows?.length ?? 0})`);
  } else fail('GET /me/producer-follows', String(listRes.status));

  const statusRes = await fetch(
    smokeApiUrl(`/me/producer-follows/status?producerProfileId=${producerId}`),
    { headers },
  );
  if (statusRes.ok) {
    const j = (await statusRes.json()) as { following?: boolean };
    ok(`status following=${j.following}`);
  } else fail('GET status', String(statusRes.status));

  const recRes = await fetch(smokeApiUrl('/me/recommendations?limit=8'), { headers });
  if (recRes.ok) {
    const j = (await recRes.json()) as {
      fromFollowedProducers?: unknown[];
      forYou?: unknown[];
      followedProducersCount?: number;
    };
    ok(
      `GET /me/recommendations followed=${j.followedProducersCount} from=${j.fromFollowedProducers?.length ?? 0} forYou=${j.forYou?.length ?? 0}`,
    );
  } else fail('GET /me/recommendations', String(recRes.status));

  const dashRes = await fetch(smokeApiUrl('/me/dashboard'), { headers });
  if (dashRes.ok) {
    const j = (await dashRes.json()) as {
      stats?: { followedProducersCount?: number };
      recommendedEvents?: unknown[];
    };
    ok(
      `GET /me/dashboard follows=${j.stats?.followedProducersCount} rec=${j.recommendedEvents?.length ?? 0}`,
    );
  } else fail('GET /me/dashboard', String(dashRes.status));

  if (followRow?.id) {
    const delRes = await fetch(smokeApiUrl(`/me/producer-follows/${followRow.id}`), {
      method: 'DELETE',
      headers,
    });
    if (delRes.ok || delRes.status === 204) ok('DELETE /me/producer-follows/:id');
    else fail('DELETE follow', String(delRes.status));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  return failed > 0 ? 1 : 0;
}

runSmokeScript('smoke:producer-follows', main);
