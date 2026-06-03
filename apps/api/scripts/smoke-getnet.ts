/**
 * Getnet production readiness smoke (config / simulated webhook).
 *
 *   pnpm --filter api run smoke:getnet -- --config
 *   pnpm --filter api run smoke:getnet -- --simulate-webhook --payment-id <id>
 *   pnpm --filter api run smoke:getnet -- --simulate-webhook --payment-id <id> --status APPROVED --event-id smoke-evt-1
 *
 * Never prints secrets. Does not create real Getnet charges.
 * Production mutations require SMOKE_GETNET_CONFIRM_PROD=yes
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { loadGetnetConfig } from '../src/modules/public-payments/providers/getnet/getnet.config';
import { loadGetnetWebhookConfig } from '../src/modules/public-payments/providers/getnet/getnet-webhook.config';
import { buildCheckoutReturnUrl } from '../src/modules/public-payments/getnet-return-url.util';

function loadEnvFile() {
  try {
    const envPath = resolve(__dirname, '../.env');
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* no .env */
  }
}

function maskSecret(value: string | undefined): string {
  if (!value?.trim()) return '(not set)';
  const v = value.trim();
  if (v.length <= 4) return '****';
  return `${v.slice(0, 2)}…${v.slice(-2)} (${v.length} chars)`;
}

function isPlausibleUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function parseArgs(argv: string[]) {
  const out = {
    config: false,
    checkAuth: false,
    simulateWebhook: false,
    dryRun: false,
    paymentId: undefined as string | undefined,
    status: 'APPROVED',
    eventId: undefined as string | undefined,
    apiBase: process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') out.config = true;
    else if (a === '--check-auth') out.checkAuth = true;
    else if (a === '--simulate-webhook') out.simulateWebhook = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--payment-id' && argv[i + 1]) out.paymentId = argv[++i];
    else if (a === '--status' && argv[i + 1]) out.status = argv[++i];
    else if (a === '--event-id' && argv[i + 1]) out.eventId = argv[++i];
    else if (a === '--api-base' && argv[i + 1]) out.apiBase = argv[++i].replace(/\/$/, '');
    else if (a === '--help' || a === '-h') {
      console.log(`Usage:
  smoke:getnet -- --config [--check-auth]
  smoke:getnet -- --simulate-webhook --payment-id <id> [--status APPROVED] [--event-id evt] [--dry-run]
  smoke:getnet -- --api-base https://api.yoteinvito.club

Env (production mutation): SMOKE_GETNET_CONFIRM_PROD=yes
`);
      process.exit(0);
    }
  }

  if (!out.config && !out.simulateWebhook) {
    out.config = true;
  }

  return out;
}

type Check = { name: string; ok: boolean; detail: string };

async function runConfigChecks(checkAuth: boolean): Promise<Check[]> {
  const checks: Check[] = [];
  const getnet = loadGetnetConfig();
  const webhook = loadGetnetWebhookConfig();
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  checks.push({
    name: 'GETNET_CLIENT_ID',
    ok: Boolean(getnet.clientId),
    detail: getnet.clientId ? maskSecret(getnet.clientId) : 'missing',
  });
  checks.push({
    name: 'GETNET_CLIENT_SECRET',
    ok: Boolean(getnet.clientSecret),
    detail: getnet.clientSecret ? maskSecret(getnet.clientSecret) : 'missing',
  });
  checks.push({
    name: 'GETNET enabled (credentials)',
    ok: getnet.enabled,
    detail: getnet.enabled ? 'yes' : 'no — Getnet checkout disabled',
  });
  checks.push({
    name: 'GETNET_ENV',
    ok: true,
    detail: process.env.GETNET_ENV ?? 'staging (default)',
  });
  checks.push({
    name: 'GETNET_AUTH_BASE_URL',
    ok: isPlausibleUrl(getnet.authBaseUrl),
    detail: getnet.authBaseUrl,
  });
  checks.push({
    name: 'GETNET_CHECKOUT_BASE_URL',
    ok: isPlausibleUrl(getnet.checkoutBaseUrl),
    detail: getnet.checkoutBaseUrl,
  });
  checks.push({
    name: 'GETNET_SCOPE',
    ok: true,
    detail: getnet.scope,
  });
  checks.push({
    name: 'GETNET_WEBHOOK_SECRET',
    ok: !webhook.requireSecret || Boolean(webhook.secret),
    detail: webhook.secret
      ? maskSecret(webhook.secret)
      : webhook.requireSecret
        ? 'REQUIRED but missing'
        : '(optional in dev)',
  });
  checks.push({
    name: 'GETNET_WEBHOOK_HEADER_NAME',
    ok: true,
    detail: webhook.headerName,
  });
  checks.push({
    name: 'GETNET_WEBHOOK_REQUIRE_SECRET',
    ok: true,
    detail: String(webhook.requireSecret),
  });
  checks.push({
    name: 'WEB_APP_URL / APP_URL',
    ok: isPlausibleUrl(
      process.env.WEB_APP_URL ?? process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '',
    ),
    detail:
      process.env.WEB_APP_URL ??
      process.env.APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      '(not set — return URLs may be wrong)',
  });
  checks.push({
    name: 'Return URL sample',
    ok: true,
    detail: buildCheckoutReturnUrl({
      orderId: 'order_sample',
      paymentId: 'pay_sample',
      tenantId: 'tenant-demo',
    }),
  });
  checks.push({
    name: 'NODE_ENV',
    ok: true,
    detail: nodeEnv,
  });
  checks.push({
    name: 'GETNET_RECONCILE_CONFIRM_PROD',
    ok: true,
    detail: process.env.GETNET_RECONCILE_CONFIRM_PROD ?? '(not set — required for reconcile --confirm in prod)',
  });
  checks.push({
    name: 'Prisma client',
    ok: true,
    detail: 'import OK',
  });

  if (checkAuth && getnet.enabled) {
    try {
      const { GetnetAuthService } = await import(
        '../src/modules/public-payments/providers/getnet/getnet-auth.service'
      );
      const auth = new GetnetAuthService();
      const token = await auth.getAccessToken();
      checks.push({
        name: 'Getnet OAuth token',
        ok: Boolean(token),
        detail: token ? `OK (${maskSecret(token)})` : 'empty token',
      });
    } catch (e) {
      checks.push({
        name: 'Getnet OAuth token',
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return checks;
}

async function checkApiHealth(apiBase: string): Promise<Check> {
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, '')}/health`);
    const ok = res.ok;
    return {
      name: 'API /health',
      ok,
      detail: `${apiBase}/health → ${res.status}`,
    };
  } catch (e) {
    return {
      name: 'API /health',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function simulateWebhook(args: ReturnType<typeof parseArgs>) {
  if (!args.paymentId) {
    console.error('FAIL: --payment-id is required for --simulate-webhook');
    process.exit(1);
  }

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && process.env.SMOKE_GETNET_CONFIRM_PROD !== 'yes') {
    console.error(
      'FAIL: en producción seteá SMOKE_GETNET_CONFIRM_PROD=yes para simular webhook',
    );
    process.exit(1);
  }

  const webhook = loadGetnetWebhookConfig();
  if (!webhook.secret) {
    console.error('FAIL: GETNET_WEBHOOK_SECRET not configured');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: args.paymentId },
    });
    if (!payment) {
      console.error(`FAIL: payment ${args.paymentId} not found`);
      process.exit(1);
    }
    if (payment.provider !== 'GETNET') {
      console.error(`FAIL: payment provider is ${payment.provider}, expected GETNET`);
      process.exit(1);
    }
    const externalRef = payment.externalReference;
    if (!externalRef) {
      console.error('FAIL: payment has no externalReference (Getnet UUID)');
      process.exit(1);
    }

    const eventId = args.eventId ?? `smoke-${Date.now()}`;
    const body = {
      eventId,
      uuid: externalRef,
      externalReference: externalRef,
      status: args.status,
      tenantId: payment.tenantId,
    };

    const url = `${args.apiBase.replace(/\/$/, '')}/public/payments/getnet/webhook`;
    console.log('Simulate webhook:');
    console.log('  URL:', url);
    console.log('  paymentId:', payment.id);
    console.log('  orderId:', payment.orderId);
    console.log('  externalReference:', externalRef);
    console.log('  status:', args.status);
    console.log('  eventId:', eventId);

    if (args.dryRun) {
      console.log('DRY-RUN: no HTTP request sent');
      process.exit(0);
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [webhook.headerName]: webhook.secret,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = text;
    }

    console.log('Response:', res.status, JSON.stringify(json, null, 2));
    if (!res.ok) {
      process.exit(1);
    }
    console.log('OK: webhook accepted');
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv.slice(2));

  console.log('smoke:getnet — Yo Te Invito');
  console.log('  API base:', args.apiBase);
  console.log('');

  if (args.simulateWebhook) {
    await simulateWebhook(args);
    return;
  }

  const checks = await runConfigChecks(args.checkAuth);
  checks.push(await checkApiHealth(args.apiBase));

  let failed = 0;
  for (const c of checks) {
    const icon = c.ok ? 'OK' : 'FAIL';
    console.log(`${icon}  ${c.name}`);
    console.log(`     ${c.detail}`);
    if (!c.ok) failed++;
  }

  console.log('');
  if (failed > 0) {
    console.error(`${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('All config checks passed.');
  console.log('');
  console.log('Next steps:');
  console.log('  pnpm --filter api run test:getnet-auth');
  console.log('  pnpm --filter api run payments:reconcile-getnet -- --dry-run --limit 10');
  console.log('  See docs/payments/GETNET_ACTIVATION_CHECKLIST.md');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
