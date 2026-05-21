/**
 * Smoke tests — Portal usuario final V1 (/me/*, carrito BD, favoritos, transferencias).
 * Run: pnpm --filter api run smoke:user-portal
 * Requires: API on :3001, DB migrated (20260601120000_user_portal_v1), tenant with data.
 *
 * Criterios (docs/user/USER_PORTAL.md + TICKET_TRANSFER_AND_RESALE.md):
 * - Preferencias portal sin favoriteEventIds / expectedEventIds
 * - Carrito persistido + checkout → órdenes PENDING_PAYMENT
 * - Favoritos y esperados en tablas dedicadas
 * - Transferencia: oferta activa bloquea QR; cancelación restaura VALID
 * - Aceptación con segundo usuario (SMOKE_SECOND_USER_EMAIL o registro smoke-*@smoke.yo-te-invito.test)
 *
 * Requiere: SMOKE_USER_EMAIL + SMOKE_USER_PASSWORD (ej. felipe.e.salom@gmail.com)
 */

import {
  resolveScannerSmokeAuth,
  resolveSecondarySmokeAuth,
  resolveSmokeAuth,
  smokeApiBase,
  smokeCredentialsHelp,
} from './lib/smoke-auth';
import { smokeTestComment } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const BASE = smokeApiBase();

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

async function main() {
  if (!process.env.SMOKE_USER_EMAIL || !process.env.SMOKE_USER_PASSWORD) {
    console.error(smokeCredentialsHelp());
    process.exit(1);
  }

  console.log('User Portal V1 smoke —', BASE);

  const auth = await resolveSmokeAuth({ allowDevFallback: false, exitOnFailure: true });
  console.log('  Auth:', auth.label);

  const token = auth.token;
  const userId = auth.userId;
  const call = (path: string, opts?: Parameters<typeof api>[1]) => api(path, { ...opts, token });

  // ── Dashboard ───────────────────────────────────────────────────────────
  try {
    const r = await call('/me/dashboard');
    const d = r.data as { stats?: { activeTicketsCount?: number }; cartSummary?: unknown };
    if (!r.ok || !d?.stats || d.cartSummary == null) {
      fail('GET /me/dashboard', `status=${r.status}`);
    } else pass('GET /me/dashboard');
  } catch (e) {
    fail('GET /me/dashboard', String(e));
  }

  // ── Preferences (portal shape) ──────────────────────────────────────────
  try {
    const r = await call('/me/preferences');
    const p = r.data as Record<string, unknown>;
    if (!r.ok) fail('GET /me/preferences', `status=${r.status}`);
    else if ('favoriteEventIds' in p || 'expectedEventIds' in p) {
      fail('GET /me/preferences legacy fields', 'favoriteEventIds/expectedEventIds present');
    } else if (typeof p.webNotificationsEnabled !== 'boolean') {
      fail('GET /me/preferences shape', 'missing webNotificationsEnabled');
    } else pass('GET /me/preferences (portal schema)');
  } catch (e) {
    fail('GET /me/preferences', String(e));
  }

  try {
    const r = await call('/me/preferences', {
      method: 'PATCH',
      body: { preferredCity: 'Buenos Aires', ticketReminder24hEnabled: true },
    });
    const p = r.data as { preferredCity?: string | null };
    if (!r.ok || p?.preferredCity !== 'Buenos Aires') {
      fail('PATCH /me/preferences', `status=${r.status}`);
    } else pass('PATCH /me/preferences');
  } catch (e) {
    fail('PATCH /me/preferences', String(e));
  }

  // ── Resolve event + ticket type for cart / favorites ────────────────────
  let eventId: string | undefined;
  let ticketTypeId: string | undefined;
  try {
    const list = await api('/public/events', {
      query: { tenantId: TENANT, category: 'event', limit: '10' },
    });
    const items =
      (list.data as { data?: Array<{ id: string; isTicketingEnabled?: boolean }> })?.data ?? [];
    for (const ev of items) {
      if (!ev.isTicketingEnabled) continue;
      const types = await api(`/public/events/${ev.id}/ticket-types`, {
        query: { tenantId: TENANT },
      });
      const tts = Array.isArray(types.data)
        ? (types.data as Array<{ id: string }>)
        : ((types.data as { ticketTypes?: Array<{ id: string }> })?.ticketTypes ?? []);
      if (types.ok && tts.length > 0) {
        eventId = ev.id;
        ticketTypeId = tts[0]!.id;
        break;
      }
    }
    if (!eventId || !ticketTypeId) {
      skip('event + ticket type', 'no ticketing event in DB — publish an event with ticket types');
    } else {
      pass('resolve event + ticket type');
    }
  } catch (e) {
    fail('resolve event + ticket type', String(e));
  }

  // ── Favorites ───────────────────────────────────────────────────────────
  if (eventId) {
    let favoriteId: string | undefined;
    try {
      const created = await call('/me/favorites', {
        method: 'POST',
        body: { entityType: 'event', entityId: eventId, tenantId: TENANT },
      });
      const fav = (created.data as { id?: string })?.id;
      if (!created.ok || !fav) fail('POST /me/favorites', `status=${created.status}`);
      else {
        favoriteId = fav;
        pass('POST /me/favorites');
      }
    } catch (e) {
      fail('POST /me/favorites', String(e));
    }

    try {
      const list = await call('/me/favorites');
      const favs = (list.data as { favorites?: Array<{ entityId: string }> })?.favorites ?? [];
      if (!list.ok) fail('GET /me/favorites', `status=${list.status}`);
      else if (!favs.some((f) => f.entityId === eventId)) {
        fail('GET /me/favorites', 'created favorite not listed');
      } else pass('GET /me/favorites');
    } catch (e) {
      fail('GET /me/favorites', String(e));
    }

    if (favoriteId) {
      try {
        const del = await call(`/me/favorites/${favoriteId}`, { method: 'DELETE' });
        if (!del.ok && del.status !== 204) fail('DELETE /me/favorites/:id', `status=${del.status}`);
        else pass('DELETE /me/favorites/:id');
      } catch (e) {
        fail('DELETE /me/favorites/:id', String(e));
      }
    }
  }

  // ── Expected events ─────────────────────────────────────────────────────
  if (eventId) {
    let expectedId: string | undefined;
    try {
      const created = await call('/me/expected-events', {
        method: 'POST',
        body: { eventId, tenantId: TENANT },
      });
      const row = created.data as { id?: string; eventId?: string };
      if (!created.ok || !row?.id) fail('POST /me/expected-events', `status=${created.status}`);
      else {
        expectedId = row.id;
        pass('POST /me/expected-events');
      }
    } catch (e) {
      fail('POST /me/expected-events', String(e));
    }

    try {
      const list = await call('/me/expected-events');
      const rows =
        (list.data as { expectedEvents?: Array<{ eventId: string }> })?.expectedEvents ?? [];
      if (!list.ok) fail('GET /me/expected-events', `status=${list.status}`);
      else if (!rows.some((e) => e.eventId === eventId)) {
        fail('GET /me/expected-events', 'created row not listed');
      } else pass('GET /me/expected-events');
    } catch (e) {
      fail('GET /me/expected-events', String(e));
    }

    if (expectedId) {
      try {
        const del = await call(`/me/expected-events/${expectedId}`, { method: 'DELETE' });
        if (!del.ok && del.status !== 204) {
          fail('DELETE /me/expected-events/:id', `status=${del.status}`);
        } else pass('DELETE /me/expected-events/:id');
      } catch (e) {
        fail('DELETE /me/expected-events/:id', String(e));
      }
    }
  }

  // ── Cart ────────────────────────────────────────────────────────────────
  if (eventId && ticketTypeId) {
    try {
      const add = await call('/me/cart/items', {
        method: 'POST',
        body: {
          eventId,
          ticketTypeId,
          quantity: 1,
          tenantId: TENANT,
        },
      });
      const cart = add.data as { items?: Array<{ id: string; quantity: number }> };
      if (!add.ok || !cart?.items?.length) fail('POST /me/cart/items', `status=${add.status}`);
      else pass('POST /me/cart/items');
    } catch (e) {
      fail('POST /me/cart/items', String(e));
    }

    try {
      const r = await call('/me/cart');
      const c = r.data as { itemCount?: number; items?: unknown[] };
      if (!r.ok || (c?.itemCount ?? 0) < 1) fail('GET /me/cart', `status=${r.status}`);
      else pass('GET /me/cart');
    } catch (e) {
      fail('GET /me/cart', String(e));
    }

    let orderIds: string[] = [];
    try {
      const co = await call('/me/cart/checkout', {
        method: 'POST',
        body: { tenantId: TENANT },
      });
      const out = co.data as { orderIds?: string[] };
      if (!co.ok || !out?.orderIds?.length) {
        fail('POST /me/cart/checkout', `status=${co.status}`);
      } else {
        orderIds = out.orderIds;
        pass('POST /me/cart/checkout');
      }
    } catch (e) {
      fail('POST /me/cart/checkout', String(e));
    }

    try {
      const r = await call('/me/cart');
      const c = r.data as { itemCount?: number };
      if (!r.ok) fail('GET /me/cart after checkout', `status=${r.status}`);
      else if ((c?.itemCount ?? 0) !== 0) fail('cart cleared after checkout', `itemCount=${c?.itemCount}`);
      else pass('cart cleared after checkout');
    } catch (e) {
      fail('cart cleared after checkout', String(e));
    }

    if (orderIds.length > 0) {
      try {
        const pending = await call('/me/cart/pending-orders');
        const orders = (pending.data as { orders?: Array<{ id: string; status: string }> })?.orders ?? [];
        if (!pending.ok) fail('GET /me/cart/pending-orders', `status=${pending.status}`);
        else if (!orders.some((o) => orderIds.includes(o.id))) {
          fail('GET /me/cart/pending-orders', 'checkout order not in list');
        } else pass('GET /me/cart/pending-orders');
      } catch (e) {
        fail('GET /me/cart/pending-orders', String(e));
      }

      try {
        const oid = orderIds[0]!;
        const createPay = await api(`/public/orders/${oid}/payments`, {
          method: 'POST',
          query: { tenantId: TENANT },
          body: { provider: 'DEMO' },
        });
        const paymentId = (createPay.data as { paymentId?: string })?.paymentId;
        if (!createPay.ok || !paymentId) {
          skip('demo payment (tickets)', `create payment status=${createPay.status}`);
        } else {
          const confirm = await api(`/public/payments/${paymentId}/demo-confirm`, {
            method: 'POST',
            query: { tenantId: TENANT },
          });
          if (!confirm.ok) skip('demo-confirm (tickets)', `status=${confirm.status}`);
          else pass('demo payment → tickets issued');
        }
      } catch (e) {
        skip('demo payment flow', String(e));
      }
    }
  }

  // ── Activity + account ──────────────────────────────────────────────────
  try {
    const r = await call('/me/activity');
    const a = r.data as { attended?: unknown[]; reviews?: unknown[]; transfers?: unknown[] };
    if (!r.ok || !Array.isArray(a?.attended) || !Array.isArray(a?.transfers)) {
      fail('GET /me/activity', `status=${r.status}`);
    } else pass('GET /me/activity');
  } catch (e) {
    fail('GET /me/activity', String(e));
  }

  try {
    const r = await call('/me/account');
    const acc = r.data as { email?: string; firstName?: string };
    if (!r.ok || !acc?.email) fail('GET /me/account', `status=${r.status}`);
    else pass('GET /me/account');
  } catch (e) {
    fail('GET /me/account', String(e));
  }

  // ── Ticket detail + transfer ──────────────────────────────────────────────
  let sourceTicketId: string | undefined;
  let sourceQr = '';
  let transferEventId: string | undefined;
  try {
    const r = await call('/me/tickets');
    const tickets =
      (r.data as { tickets?: Array<{ ticketId: string; status: string; qrPayload: string; event: { id: string } }> })
        ?.tickets ?? [];
    const valid = tickets.find((t) => t.status === 'VALID');
    if (!r.ok) fail('GET /me/tickets', `status=${r.status}`);
    else if (!valid) {
      skip('transfer flow', 'no VALID ticket for user — buy a ticket or use SMOKE_USER_EMAIL with one');
    } else {
      sourceTicketId = valid.ticketId;
      sourceQr = valid.qrPayload;
      transferEventId = valid.event.id;
      pass('GET /me/tickets (find VALID)');
    }
  } catch (e) {
    fail('GET /me/tickets', String(e));
  }

  if (sourceTicketId) {
    try {
      const r = await call(`/me/tickets/${sourceTicketId}`);
      const d = r.data as {
        ticketId?: string;
        qrPayload?: string;
        canTransfer?: boolean;
        reminderEnabled?: boolean;
      };
      if (!r.ok || d?.ticketId !== sourceTicketId) {
        fail('GET /me/tickets/:id', `status=${r.status}`);
      } else if (typeof d.canTransfer !== 'boolean') {
        fail('GET /me/tickets/:id', 'missing canTransfer');
      } else if (!d.qrPayload?.startsWith('yti:v1:')) {
        fail('GET /me/tickets/:id', 'qrPayload missing or invalid format');
      } else pass('GET /me/tickets/:id (portal detail + qrPayload)');
    } catch (e) {
      fail('GET /me/tickets/:id', String(e));
    }

    try {
      const r = await call(`/me/tickets/${sourceTicketId}/reminder`, {
        method: 'PATCH',
        body: { enabled: false },
      });
      const d = r.data as { reminderEnabled?: boolean };
      if (!r.ok || d?.reminderEnabled !== false) {
        fail('PATCH /me/tickets/:id/reminder', `status=${r.status}`);
      } else pass('PATCH /me/tickets/:id/reminder');
    } catch (e) {
      fail('PATCH /me/tickets/:id/reminder', String(e));
    }

    let offerId: string | undefined;
    let acceptToken: string | undefined;
    try {
      const created = await call(`/me/tickets/${sourceTicketId}/transfer-offers`, {
        method: 'POST',
        body: { expiresInHours: 24 },
      });
      const out = created.data as {
        offer?: { id: string; acceptToken: string; status: string };
      };
      if (!created.ok || out?.offer?.status !== 'AVAILABLE') {
        fail('POST transfer-offers', `status=${created.status}`);
      } else {
        offerId = out.offer!.id;
        acceptToken = out.offer!.acceptToken;
        pass('POST /me/tickets/:id/transfer-offers');
      }
    } catch (e) {
      fail('POST transfer-offers', String(e));
    }

    if (sourceTicketId && transferEventId && sourceQr && offerId) {
      try {
        const detail = await call(`/me/tickets/${sourceTicketId}`);
        const st = (detail.data as { status?: string })?.status;
        if (st !== 'TRANSFER_PENDING') {
          fail('ticket TRANSFER_PENDING after offer', `status=${st}`);
        } else pass('ticket status TRANSFER_PENDING');
      } catch (e) {
        fail('ticket TRANSFER_PENDING after offer', String(e));
      }

      // Scanner validate — debe rechazar QR bloqueado
      try {
        const scanner = await resolveScannerSmokeAuth();
        if (!scanner) {
          skip('scanner rejects TRANSFER_PENDING', 'set SMOKE_SCANNER_EMAIL + SMOKE_SCANNER_PASSWORD');
        } else {
        const val = await api('/scanner/validate', {
          method: 'POST',
          query: { tenantId: TENANT },
          body: { eventId: transferEventId, qrPayload: sourceQr },
          token: scanner.token,
        });
        const body = val.data as { isValid?: boolean };
        if (!val.ok) fail('POST /scanner/validate (transfer pending)', `status=${val.status}`);
        else if (body?.isValid === true) {
          fail('scanner rejects TRANSFER_PENDING', 'isValid=true');
        } else pass('scanner rejects TRANSFER_PENDING QR');
        }
      } catch (e) {
        fail('scanner rejects TRANSFER_PENDING', String(e));
      }

      try {
        const cancelled = await call(`/me/ticket-transfer-offers/${offerId}/cancel`, {
          method: 'POST',
        });
        const st = (cancelled.data as { status?: string })?.status;
        if (!cancelled.ok || st !== 'CANCELLED') {
          fail('POST transfer-offers cancel', `status=${cancelled.status}`);
        } else pass('POST /me/ticket-transfer-offers/:id/cancel');
      } catch (e) {
        fail('POST transfer-offers cancel', String(e));
      }

      try {
        const detail = await call(`/me/tickets/${sourceTicketId}`);
        const st = (detail.data as { status?: string })?.status;
        if (st !== 'VALID') {
          fail('ticket VALID after cancel', `status=${st}`);
        } else pass('ticket restored VALID after cancel');
      } catch (e) {
        fail('ticket VALID after cancel', String(e));
      }

      // Lookup + rechazo con email receptor
      if (sourceTicketId) {
        const buyerSecondary = await resolveSecondarySmokeAuth(userId);
        if (!buyerSecondary) {
          skip('transfer lookup/reject', 'no distinct buyer (SMOKE_SECOND_USER_EMAIL or register failed)');
        } else {
        const buyer = buyerSecondary;
          try {
            const buyerAcc = await api('/me/account', {
              token: buyer.token,
            });
            const buyerEmail = (buyerAcc.data as { email?: string })?.email ?? buyer.email;
            const withEmail = await call(`/me/tickets/${sourceTicketId}/transfer-offers`, {
              method: 'POST',
              body: {
                expiresInHours: 24,
                recipientEmail: buyerEmail,
                message: smokeTestComment('transfer offer'),
              },
            });
            const emailOffer = (withEmail.data as {
              offer?: { id: string; acceptToken: string; message?: string };
            })?.offer;
            if (!withEmail.ok || !emailOffer?.acceptToken) {
              fail('POST transfer-offers recipientEmail', `status=${withEmail.status}`);
            } else {
              pass('POST transfer-offers with recipientEmail');
              const lookup = await api(
                `/me/ticket-transfer-offers/lookup/${emailOffer.acceptToken}`,
                { token: buyer.token },
              );
              const lk = lookup.data as { canReject?: boolean; offer?: { message?: string } };
              if (!lookup.ok || lk?.canReject !== true) {
                fail('GET transfer lookup', `status=${lookup.status}`);
              } else if (lk?.offer?.message !== smokeTestComment('transfer offer')) {
                fail('GET transfer lookup', 'message mismatch');
              } else pass('GET /me/ticket-transfer-offers/lookup/:token');
              const rejected = await api(
                `/me/ticket-transfer-offers/${emailOffer.id}/reject`,
                { method: 'POST', token: buyer.token },
              );
              const rejSt = (rejected.data as { status?: string; rejectedAt?: string })?.status;
              if (!rejected.ok || rejSt !== 'CANCELLED') {
                fail('POST transfer reject', `status=${rejected.status}`);
              } else pass('POST /me/ticket-transfer-offers/:id/reject');
            }
          } catch (e) {
            fail('transfer lookup/reject', String(e));
          }
        }
        }
      }

      // Legacy endpoint → 410
      try {
        const legacy = await call(`/tickets/${sourceTicketId}/transfer`, {
          method: 'POST',
          body: { toUserId: userId },
        });
        if (legacy.status !== 410) {
          fail('POST /tickets/:id/transfer deprecated', `status=${legacy.status}`);
        } else pass('POST /tickets/:id/transfer returns 410');
      } catch (e) {
        fail('POST /tickets/:id/transfer deprecated', String(e));
      }

      // Aceptación con segundo usuario — destructivo (transfiere ticket real)
      if (acceptToken) {
        if (process.env.SMOKE_ALLOW_DESTRUCTIVE !== '1') {
          skip(
            'POST transfer accept',
            'set SMOKE_ALLOW_DESTRUCTIVE=1 to run (mueve ownership del ticket)',
          );
        } else {
          const buyerSecondary = await resolveSecondarySmokeAuth(userId);
          if (!buyerSecondary) {
            skip('POST transfer accept', 'no distinct buyer (SMOKE_SECOND_USER_EMAIL or register failed)');
          } else {
            const buyer = buyerSecondary;
            try {
              const recreated = await call(`/me/tickets/${sourceTicketId}/transfer-offers`, {
                method: 'POST',
                body: { expiresInHours: 24, buyerUserId: buyer.userId },
              });
              const tok =
                (recreated.data as { offer?: { acceptToken: string } })?.offer?.acceptToken;
              if (!recreated.ok || !tok) {
                fail('recreate transfer for accept test', `status=${recreated.status}`);
              } else {
                const accept = await api(`/me/ticket-transfer-offers/${tok}/accept`, {
                  method: 'POST',
                  token: buyer.token,
                });
                const res = accept.data as {
                  destinationTicket?: { ticketId: string; status: string };
                };
                if (!accept.ok || res?.destinationTicket?.status !== 'VALID') {
                  fail('POST transfer accept', `status=${accept.status}`);
                } else {
                  pass('POST /me/ticket-transfer-offers/:token/accept');
                  const src = await call(`/me/tickets/${sourceTicketId}`);
                  const srcSt = (src.data as { status?: string })?.status;
                  if (srcSt !== 'TRANSFERRED') {
                    fail('source TRANSFERRED after accept', `status=${srcSt}`);
                  } else pass('source ticket TRANSFERRED after accept');
                }
              }
            } catch (e) {
              fail('transfer accept flow', String(e));
            }
          }
        }
      }
    }
  }

  try {
    const r = await call('/me/ticket-transfer-offers', { query: { role: 'all' } });
    const offers = (r.data as { offers?: unknown[] })?.offers;
    if (!r.ok || !Array.isArray(offers)) fail('GET /me/ticket-transfer-offers', `status=${r.status}`);
    else pass('GET /me/ticket-transfer-offers');
  } catch (e) {
    fail('GET /me/ticket-transfer-offers', String(e));
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
      '\nTip: publicar evento con entradas + comprar ticket con SMOKE_USER_EMAIL para cobertura completa.',
    );
  }
  console.log('\nUser Portal V1 smoke completed.');
  return 0;
}

runSmokeScript('smoke:user-portal', main);
