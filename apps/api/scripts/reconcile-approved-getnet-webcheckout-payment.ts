/**
 * Manual reconciliation for Getnet Web Checkout payments approved in portal
 * but left PENDING locally (e.g. webhook schema failure pre-ed0cc3e).
 *
 * Dry-run by default — no DB mutations.
 *
 * Usage:
 *   pnpm --filter api run reconcile:getnet-approved -- --paymentId <id> --dry-run
 *   REMOTE_STATUS=Authorized REMOTE_PAYMENT_ID=<uuid> \
 *     CONFIRM_APPROVED_GETNET_RECONCILE=yes \
 *     pnpm --filter api run reconcile:getnet-approved -- --paymentId <id>
 */
import 'reflect-metadata';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from '../src/prisma/prisma.service';
import { GetnetReconciliationService } from '../src/modules/public-payments/getnet-reconciliation.service';
import {
  asMetadataJson,
  mergeReconciliationMetadata,
} from '../src/modules/public-payments/getnet-reconciliation.metadata.util';
import { isWebCheckoutPaymentMetadata } from '../src/modules/public-payments/providers/getnet/webcheckout/getnet-webcheckout.config';
import { expectedTicketCountFromItems } from '../src/modules/public-payments/order-fulfillment.util';
import { GetnetReconcileScriptModule } from './getnet-reconcile-script.module';

type ManualReconciliationMetadata = {
  manualReconciliation?: {
    confirmedAt: string;
    source: 'GETNET_PORTAL_MANUAL_CONFIRMATION';
    remoteStatus: string;
    paymentIntentId: string;
    externalPaymentId?: string;
    authorizationCode?: string;
    checkoutId?: string;
    note: string;
  };
  paymentIntentId?: string;
  externalPaymentId?: string;
  authorizationCode?: string;
  checkoutId?: string;
};

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

function parseArgs(argv: string[]) {
  const out = {
    dryRun: true,
    paymentId: undefined as string | undefined,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      out.dryRun = true;
    } else if (a === '--confirm') {
      out.dryRun = false;
    } else if ((a === '--paymentId' || a === '--payment-id') && argv[i + 1]) {
      out.paymentId = argv[++i];
    } else if (a === '--help' || a === '-h') {
      console.log(`Usage:
  reconcile:getnet-approved -- --paymentId <id> --dry-run
  REMOTE_STATUS=Authorized CONFIRM_APPROVED_GETNET_RECONCILE=yes \\
    reconcile:getnet-approved -- --paymentId <id> --confirm

Env (live only):
  CONFIRM_APPROVED_GETNET_RECONCILE=yes   required
  REMOTE_STATUS=Authorized|APPROVED       required
  REMOTE_PAYMENT_ID=<uuid>                optional
  REMOTE_AUTHORIZATION_CODE=<code>        optional
  REMOTE_CHECKOUT_ID=<uuid>               optional`);
      process.exit(0);
    }
  }

  return out;
}

function readMetadataRecord(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  return metadata as Record<string, unknown>;
}

function extractPaymentIntentId(metadata: unknown): string | null {
  const meta = readMetadataRecord(metadata);
  const id =
    (typeof meta.paymentIntentId === 'string' && meta.paymentIntentId.trim()) ||
    null;
  return id;
}

const APPROVED_REMOTE_STATUSES = new Set([
  'APPROVED',
  'AUTHORIZED',
  'SUCCESS',
]);

function normalizeRemoteStatus(raw: string | undefined): string {
  const value = raw?.trim().toUpperCase() ?? '';
  if (value === 'AUTHORIZED') return 'AUTHORIZED';
  if (value === 'APPROVED' || value === 'SUCCESS') return 'APPROVED';
  return value;
}

function assertApprovedRemoteStatus(remoteStatus: string): void {
  if (!APPROVED_REMOTE_STATUSES.has(remoteStatus)) {
    throw new Error(
      `REMOTE_STATUS must be Authorized or APPROVED (got "${remoteStatus || '(empty)'}")`,
    );
  }
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv.slice(2));

  if (!args.paymentId?.trim()) {
    console.error('FAIL: --paymentId is required');
    process.exit(1);
  }

  const paymentId = args.paymentId.trim();
  const remoteStatusRaw = process.env.REMOTE_STATUS;
  const remotePaymentId = process.env.REMOTE_PAYMENT_ID?.trim();
  const authorizationCode = process.env.REMOTE_AUTHORIZATION_CODE?.trim();
  const checkoutId = process.env.REMOTE_CHECKOUT_ID?.trim();

  if (args.dryRun) {
    console.log('MODO DRY-RUN — sin mutaciones');
  } else {
    if (process.env.CONFIRM_APPROVED_GETNET_RECONCILE !== 'yes') {
      console.error(
        'Live reconcile blocked. Set CONFIRM_APPROVED_GETNET_RECONCILE=yes',
      );
      process.exit(1);
    }
    assertApprovedRemoteStatus(normalizeRemoteStatus(remoteStatusRaw));
    console.log('MODO CONFIRM — se mutará la base de datos vía reconciliación');
  }

  const app = await NestFactory.createApplicationContext(
    GetnetReconcileScriptModule,
    { logger: ['error', 'warn'] },
  );

  try {
    const prisma = app.get(PrismaService);
    const reconciliation = app.get(GetnetReconciliationService);
    reconciliation.assertDatabaseReady();

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: { include: { orderItems: true } },
      },
    });

    if (!payment) {
      console.error(`FAIL: Payment not found: ${paymentId}`);
      process.exit(1);
    }

    if (payment.provider !== 'GETNET') {
      console.error(`FAIL: Payment provider is ${payment.provider}, expected GETNET`);
      process.exit(1);
    }

    if (!isWebCheckoutPaymentMetadata(payment.metadata)) {
      console.error(
        'FAIL: metadata.getnetIntegration must be "webcheckout" for this script',
      );
      process.exit(1);
    }

    const paymentIntentId = extractPaymentIntentId(payment.metadata);
    if (!paymentIntentId) {
      console.error('FAIL: metadata.paymentIntentId is required');
      process.exit(1);
    }

    const order = payment.order;
    if (!order) {
      console.error('FAIL: Order missing for payment');
      process.exit(1);
    }

    const expectedTickets = expectedTicketCountFromItems(order.orderItems);
    const existingTickets = await prisma.ticket.count({
      where: { orderId: order.id, source: 'ORDER' },
    });

    console.log('\n--- payment snapshot ---');
    console.log(`paymentId: ${payment.id}`);
    console.log(`orderId: ${order.id}`);
    console.log(`localStatus: ${payment.status}`);
    console.log(`orderStatus: ${order.status}`);
    console.log(`paymentIntentId: ${paymentIntentId}`);
    console.log(`tickets: ${existingTickets}/${expectedTickets}`);

    if (payment.status === 'APPROVED') {
      if (order.status === 'PAID' && existingTickets >= expectedTickets) {
        console.log('\nOK: Payment already APPROVED and order fulfilled — no action');
        return;
      }
      console.log(
        '\nNOTE: Payment APPROVED but order/tickets incomplete — reconcile may still fulfill',
      );
    } else if (payment.status !== 'PENDING') {
      console.error(
        `FAIL: Payment status is ${payment.status}; expected PENDING (or APPROVED for idempotent check)`,
      );
      process.exit(1);
    }

    const remoteStatus = normalizeRemoteStatus(remoteStatusRaw);
    if (!args.dryRun) {
      assertApprovedRemoteStatus(remoteStatus);
    }

    if (args.dryRun) {
      const previewStatus = remoteStatus || 'AUTHORIZED';
      if (!APPROVED_REMOTE_STATUSES.has(previewStatus)) {
        console.warn(
          `\nWARN: REMOTE_STATUS not set — dry-run will assume ${previewStatus}`,
        );
      }
      const result = await reconciliation.reconcilePayment(paymentId, {
        source: 'GETNET_PORTAL_MANUAL_CONFIRMATION',
        dryRun: true,
        remoteStatusOverride: previewStatus,
      });
      console.log('\n--- dry-run reconcile result ---');
      console.log(JSON.stringify(result, null, 2));
      console.log(
        '\nTo apply: set CONFIRM_APPROVED_GETNET_RECONCILE=yes REMOTE_STATUS=Authorized ... --confirm',
      );
      return;
    }

    const confirmedAt = new Date().toISOString();
    const manualPatch: ManualReconciliationMetadata = {
      manualReconciliation: {
        confirmedAt,
        source: 'GETNET_PORTAL_MANUAL_CONFIRMATION',
        remoteStatus,
        paymentIntentId,
        ...(remotePaymentId ? { externalPaymentId: remotePaymentId } : {}),
        ...(authorizationCode ? { authorizationCode } : {}),
        ...(checkoutId ? { checkoutId } : {}),
        note:
          'Approved status confirmed in Getnet portal; reconciled after prior webhook schema failure',
      },
      paymentIntentId,
      ...(remotePaymentId ? { externalPaymentId: remotePaymentId } : {}),
      ...(authorizationCode ? { authorizationCode } : {}),
      ...(checkoutId ? { checkoutId } : {}),
    };

    const nextMetadata = mergeReconciliationMetadata(
      payment.metadata,
      manualPatch,
    );

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        metadata: asMetadataJson(nextMetadata),
        ...(remotePaymentId && !payment.externalPaymentId
          ? { externalPaymentId: remotePaymentId }
          : {}),
      },
    });

    const result = await reconciliation.reconcilePayment(paymentId, {
      source: 'GETNET_PORTAL_MANUAL_CONFIRMATION',
      dryRun: false,
      remoteStatusOverride: remoteStatus,
    });

    console.log('\n--- reconcile result ---');
    console.log(JSON.stringify(result, null, 2));

    const refreshed = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        status: true,
        order: { select: { status: true } },
      },
    });
    const ticketCount = await prisma.ticket.count({
      where: { orderId: order.id, source: 'ORDER' },
    });

    console.log('\n--- post-check ---');
    console.log(`payment.status: ${refreshed?.status ?? 'n/a'}`);
    console.log(`order.status: ${refreshed?.order?.status ?? 'n/a'}`);
    console.log(`tickets: ${ticketCount}/${expectedTickets}`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
