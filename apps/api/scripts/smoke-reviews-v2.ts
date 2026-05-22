/**
 * Smoke tests — Reviews V2 (public, disputes, ranking, B2B).
 * Run: pnpm --filter api run smoke:reviews
 * Requires: API on :3001, DB migrated, SMOKE_USER_EMAIL + SMOKE_USER_PASSWORD.
 * Optional role-specific: SMOKE_PRODUCER_EMAIL, SMOKE_GASTRO_EMAIL, SMOKE_REFERRER_EMAIL, SMOKE_ADMIN_EMAIL
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
  user: 'SMOKE_USER_EMAIL',
  producer: 'SMOKE_PRODUCER_EMAIL',
  gastro: 'SMOKE_GASTRO_EMAIL',
  referrer: 'SMOKE_REFERRER_EMAIL',
  admin: 'SMOKE_ADMIN_EMAIL',
};

async function loginForRole(
  role: keyof typeof ROLE_EMAIL_ENV,
): Promise<{ token: string; userId: string } | null> {
  const envKey = ROLE_EMAIL_ENV[role];
  const email =
    process.env[envKey]?.trim().toLowerCase() ??
    (role === 'user' || role === 'admin' ? getSmokeCredentials()?.email : undefined);
  const password =
    process.env[`SMOKE_${role.toUpperCase()}_PASSWORD`] ?? process.env.SMOKE_USER_PASSWORD;
  if (!email || !password) return null;
  return login(email, password);
}

type Result = { name: string; ok: boolean; skip?: boolean; err?: string };

const results: Result[] = [];

function pass(name: string) {
  results.push({ name, ok: true });
}

function fail(name: string, err: string) {
  results.push({ name, ok: false, err });
}

function skip(name: string, reason: string) {
  results.push({ name, ok: true, skip: true, err: reason });
}

async function api(
  path: string,
  opts?: {
    method?: string;
    query?: Record<string, string>;
    body?: unknown;
    token?: string | null;
    devUserId?: string;
  },
) {
  const url = new URL(path.startsWith('/') ? path.slice(1) : path, BASE);
  if (opts?.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
  else if (opts?.devUserId) headers['X-Dev-User-Id'] = opts.devUserId;

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

const gastroAspects = {
  foodQuality: 8,
  staffAttention: 7,
  placeAmbience: 9,
  priceQuality: 8,
};

async function main() {
  if (!getSmokeCredentials()) {
    console.error(smokeCredentialsHelp());
    process.exit(1);
  }

  console.log('Reviews V2 smoke —', BASE);

  // ── Public: gastro event + summary + list ─────────────────────────────
  let gastroEventId: string | undefined;
  try {
    const list = await api('/public/events', {
      query: { tenantId: TENANT, category: 'gastro', limit: '5' },
    });
    const items = (list.data as { data?: Array<{ id: string; rankingScore?: number }> })?.data ?? [];
    gastroEventId = items[0]?.id;
    const leaksRanking = items.some((e) => 'rankingScore' in e && e.rankingScore != null);
    if (!list.ok) {
      fail('public/events (gastro)', `status=${list.status}`);
    } else if (!gastroEventId) {
      skip('public/events (gastro)', 'no gastro events in DB — create content or set SMOKE_USER_EMAIL');
    } else if (leaksRanking) {
      fail('public/events no rankingScore leak', 'rankingScore in list payload');
    } else {
      pass('public/events (gastro)');
    }
  } catch (e) {
    fail('public/events (gastro)', String(e));
  }

  try {
    const r = await api('/public/events/recommended', {
      query: { tenantId: TENANT, limit: '5', mode: 'recommended' },
    });
    const arr = r.data as unknown[];
    if (!r.ok || !Array.isArray(arr)) fail('public/events/recommended', `status=${r.status}`);
    else pass('public/events/recommended');
  } catch (e) {
    fail('public/events/recommended', String(e));
  }

  if (gastroEventId) {
    try {
      const r = await api('/public/reviews/summary', {
        query: { tenantId: TENANT, category: 'gastro', entityId: gastroEventId },
      });
      const s = r.data as { averageRating?: number | null; validReviewCount?: number };
      if (!r.ok || typeof s.validReviewCount !== 'number') {
        fail('public/reviews/summary', `status=${r.status} ${JSON.stringify(r.data)}`);
      } else {
        pass('public/reviews/summary (gastro)');
      }
    } catch (e) {
      fail('public/reviews/summary', String(e));
    }

    try {
      const r = await api('/public/reviews', {
        query: { tenantId: TENANT, category: 'gastro', entityId: gastroEventId, limit: '5' },
      });
      const d = r.data as { reviews?: unknown[]; summary?: unknown };
      if (!r.ok || !Array.isArray(d.reviews) || !d.summary) {
        fail('public/reviews list V2', `status=${r.status}`);
      } else {
        pass('public/reviews list V2');
      }
    } catch (e) {
      fail('public/reviews list V2', String(e));
    }

    try {
      const r = await api(`/public/events/${gastroEventId}`, { query: { tenantId: TENANT } });
      const detail = r.data as Record<string, unknown>;
      if (!r.ok) fail('public/events detail no leak', `status=${r.status}`);
      else if ('rankingScore' in detail || 'bayesianRating' in detail) {
        fail('public/events detail no leak', 'internal ranking fields exposed');
      } else pass('public/events detail no ranking leak');
    } catch (e) {
      fail('public/events detail no leak', String(e));
    }
  } else {
    skip('public/reviews/* (gastro)', 'no gastro event');
  }

  // ── Authenticated: create public review (SMOKE_USER_EMAIL) ─────────────
  let smokeCreatedReviewId: string | undefined;
  const endUser = await loginForRole('user');
  if (!endUser) {
    skip('POST /me/reviews', 'reviewer user not in DB — register or set SMOKE_USER_EMAIL');
  } else if (!gastroEventId) {
    skip('POST /me/reviews', 'no gastro event');
  } else {
    try {
      const overall = 8;
      const create = await api('/me/reviews', {
        method: 'POST',
        token: endUser.token,
        body: {
          eventId: gastroEventId,
          overallRating: overall,
          aspectRatings: gastroAspects,
          comment: smokeTestComment('Reviews V2 — experiencia de prueba automatizada.'),
        },
      });
      if (create.ok) {
        pass('POST /me/reviews (create)');
        smokeCreatedReviewId = (create.data as { id?: string })?.id;
      } else if (create.status === 409) {
        pass('POST /me/reviews (already exists — ok)');
      } else {
        fail('POST /me/reviews', `status=${create.status} ${JSON.stringify(create.data)}`);
      }

      const notif = await api('/me/notifications', { token: endUser.token });
      if (!notif.ok) {
        fail('GET /me/notifications (reviewer)', `status=${notif.status}`);
      } else {
        pass('GET /me/notifications (reviewer)');
      }
      const profile = await api(`/public/users/${endUser.userId}/review-profile`, {
        query: { tenantId: TENANT },
      });
      const p = profile.data as { displayName?: string; reviewerTier?: string };
      if (!profile.ok || !p.displayName) {
        fail('GET /public/users/:id/review-profile', `status=${profile.status}`);
      } else {
        pass('GET /public/users/:id/review-profile');
      }

      const userReviews = await api(`/public/users/${endUser.userId}/reviews`, {
        query: { tenantId: TENANT, limit: '5' },
      });
      if (!userReviews.ok || !Array.isArray((userReviews.data as { reviews?: unknown[] })?.reviews)) {
        fail('GET /public/users/:id/reviews', `status=${userReviews.status}`);
      } else {
        pass('GET /public/users/:id/reviews');
      }
    } catch (e) {
      fail('authenticated public review flow', String(e));
    }
  }

  // ── Producer portal + dispute (SMOKE_PRODUCER_EMAIL) ────────────────────
  const producer = await loginForRole('producer');
  if (!producer) {
    skip('producer/reviews*', 'set SMOKE_PRODUCER_EMAIL + password (producer role in DB)');
  } else {
    try {
      const summary = await api('/producer/reviews/summary', { token: producer.token });
      if (!summary.ok) fail('GET /producer/reviews/summary', `status=${summary.status}`);
      else pass('GET /producer/reviews/summary');

      const list = await api('/producer/reviews', {
        query: { limit: '5' },
        token: producer.token,
      });
      const reviews = (list.data as { reviews?: Array<{ id: string }> })?.reviews ?? [];
      if (!list.ok) fail('GET /producer/reviews', `status=${list.status}`);
      else pass('GET /producer/reviews');

      const prodNotif = await api('/me/notifications', { token: producer.token });
      const received = (
        (prodNotif.data as { items?: Array<{ kind: string; referenceKey: string }> })?.items ??
        []
      ).filter(
        (i) =>
          i.kind === 'REVIEW_RECEIVED' &&
          (smokeCreatedReviewId
            ? i.referenceKey === `review-received:${smokeCreatedReviewId}`
            : i.referenceKey.startsWith('review-received:')),
      );
      if (!prodNotif.ok) {
        fail('GET /me/notifications (producer REVIEW_RECEIVED)', `status=${prodNotif.status}`);
      } else if (received.length === 0) {
        skip(
          'producer REVIEW_RECEIVED notification',
          'no in-app item (gastro event may use gastro profile, not producer)',
        );
      } else {
        pass('producer REVIEW_RECEIVED notification');
      }

      const reviewId = reviews[0]?.id;
      if (reviewId) {
        const reply = await api(`/producer/reviews/${reviewId}/reply`, {
          method: 'POST',
          token: producer.token,
          body: { body: smokeTestComment('Respuesta productora — gracias por tu comentario.') },
        });
        if (!reply.ok) fail('POST /producer/reviews/:id/reply', `status=${reply.status}`);
        else {
          pass('POST /producer/reviews/:id/reply');
          if (endUser) {
            const authorNotif = await api('/me/notifications', { token: endUser.token });
            const hasReply = (
              (authorNotif.data as { items?: Array<{ kind: string }> })?.items ?? []
            ).some((i) => i.kind === 'REVIEW_OFFICIAL_REPLY');
            if (!authorNotif.ok) {
              fail('GET /me/notifications (REVIEW_OFFICIAL_REPLY)', `status=${authorNotif.status}`);
            } else if (!hasReply) {
              skip(
                'reviewer REVIEW_OFFICIAL_REPLY notification',
                'review may be guest or author differs from SMOKE_USER',
              );
            } else {
              pass('reviewer REVIEW_OFFICIAL_REPLY notification');
            }
          }
        }
      } else {
        skip('POST /producer/reviews/:id/reply', 'no reviews for producer events');
      }
    } catch (e) {
      fail('producer reviews flow', String(e));
    }
  }

  // ── Gastro reply route (SMOKE_GASTRO_EMAIL) ─────────────────────────────
  const gastroUser = await loginForRole('gastro');
  if (!gastroUser) {
    skip('gastro/reviews*', 'set SMOKE_GASTRO_EMAIL + password (gastro role in DB)');
  } else {
    try {
      const sum = await api('/gastro/reviews/summary', { token: gastroUser.token });
      if (!sum.ok) fail('GET /gastro/reviews/summary', `status=${sum.status}`);
      else pass('GET /gastro/reviews/summary');
    } catch (e) {
      fail('gastro/reviews/summary', String(e));
    }
  }

  // ── Admin hide/restore + platform reply (admin) ───────────────────────
  const admin = await loginForRole('admin');
  if (!admin) {
    skip('admin/reviews*', 'set SMOKE_ADMIN_EMAIL or use master admin as SMOKE_USER_EMAIL');
  } else {
    const adminAuth = { token: admin.token };

    if (gastroEventId) {
      try {
        const list = await api('/public/reviews', {
          query: { tenantId: TENANT, category: 'gastro', entityId: gastroEventId, limit: '1' },
        });
        const reviewId = (list.data as { reviews?: Array<{ id: string }> })?.reviews?.[0]?.id;
        if (!reviewId) {
          skip('admin hide/restore', 'no public review to moderate');
        } else {
          const hide = await api(`/admin/reviews/${reviewId}/hide`, {
            method: 'POST',
            ...adminAuth,
            body: { reason: smokeTestComment('hide') },
          });
          if (!hide.ok) fail('POST /admin/reviews/:id/hide', `status=${hide.status}`);
          else pass('POST /admin/reviews/:id/hide');

          const restore = await api(`/admin/reviews/${reviewId}/restore`, {
            method: 'POST',
            ...adminAuth,
            body: {},
          });
          if (!restore.ok) fail('POST /admin/reviews/:id/restore', `status=${restore.status}`);
          else pass('POST /admin/reviews/:id/restore');

          const platformReply = await api(`/admin/reviews/${reviewId}/reply`, {
            method: 'POST',
            ...adminAuth,
            body: { body: smokeTestComment('Respuesta plataforma — mensaje de prueba.') },
          });
          if (!platformReply.ok) fail('POST /admin/reviews/:id/reply', `status=${platformReply.status}`);
          else pass('POST /admin/reviews/:id/reply (PLATFORM_ADMIN)');
        }
      } catch (e) {
        fail('admin moderation flow', String(e));
      }
    } else {
      skip('admin/reviews*', 'no gastro event');
    }
  }

  // ── B2B commercial (producer + referrer) ──────────────────────────────
  const referrer = await loginForRole('referrer');
  if (!producer || !referrer) {
    skip('B2B commercial-reviews', 'set SMOKE_PRODUCER_EMAIL and SMOKE_REFERRER_EMAIL');
  } else {
    try {
      const associated = await api('/producer/referrers/associated', { token: producer.token });
      const refs = (associated.data as { referrers?: Array<{ id: string }> })?.referrers ?? [];
      const referrerProfileId = refs[0]?.id;
      if (!referrerProfileId) {
        skip('B2B commercial-reviews', 'no active producer↔referrer relationship');
      } else {
        const b2b = await api(`/producer/referrers/${referrerProfileId}/commercial-reviews`, {
          method: 'POST',
          token: producer.token,
          body: {
            overallRating: 8,
            aspectRatings: {
              referralQuality: 8,
              communication: 9,
              agreementCompliance: 7,
              commercialReliability: 8,
            },
            comment: smokeTestComment('B2B — valoración comercial de prueba.'),
          },
        });
        if (!b2b.ok) fail('POST commercial-reviews (producer→referrer)', `status=${b2b.status}`);
        else pass('POST commercial-reviews (producer→referrer)');

        const listB2b = await api(`/producer/referrers/${referrerProfileId}/commercial-reviews`, {
          token: producer.token,
        });
        const bundle = listB2b.data as { aboutReferrer?: Array<{ aspectRatings?: Record<string, number> }> };
        const hasAspects = bundle.aboutReferrer?.some(
          (r) => r.aspectRatings && Object.keys(r.aspectRatings).length >= 4,
        );
        if (!listB2b.ok) fail('GET commercial-reviews bundle', `status=${listB2b.status}`);
        else if (!hasAspects) fail('B2B aspectRatings persisted', 'no aspects in response');
        else pass('GET commercial-reviews (aspects persisted)');
      }
    } catch (e) {
      fail('B2B commercial-reviews', String(e));
    }
  }

  // ── Report ──────────────────────────────────────────────────────────────
  console.log('\nResults:');
  for (const r of results) {
    const icon = r.skip ? '○' : r.ok ? '✓' : '✗';
    const suffix = r.skip ? ` (skip: ${r.err})` : r.err ? ` — ${r.err}` : '';
    console.log(`  ${icon} ${r.name}${suffix}`);
  }

  const failed = results.filter((r) => !r.ok && !r.skip);
  const skipped = results.filter((r) => r.skip);
  const passed = results.filter((r) => r.ok && !r.skip);
  console.log(
    `\n${passed.length} passed, ${skipped.length} skipped, ${failed.length} failed`,
  );
  if (failed.length > 0) return 1;
  if (skipped.length > 0) {
    console.log(
      '\nTip: para cobertura completa → eventos publicados + SMOKE_USER_EMAIL con ticket comprado o registro manual.',
    );
  }
  console.log('\nReviews V2 smoke completed.');
  return 0;
}

runSmokeScript('smoke:reviews', main);
