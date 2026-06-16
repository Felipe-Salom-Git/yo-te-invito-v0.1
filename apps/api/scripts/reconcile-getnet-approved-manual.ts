/**
 * Manual reconciliation for Getnet Web Checkout payments approved in portal
 * but left PENDING locally with EXPIRED (or PENDING_PAYMENT) orders.
 *
 * Uses OrderFulfillmentService via GetnetReconciliationService with
 * forceExpiredApprovedFulfillment for expired-order recovery.
 *
 * Usage:
 *   pnpm --filter api run payments:reconcile-getnet-approved-manual -- \
 *     --payment-id <id> --remote-payment-id <uuid> --dry-run
 *
 * Live (requires CONFIRM_GETNET_APPROVED_MANUAL=yes):
 *   CONFIRM_GETNET_APPROVED_MANUAL=yes pnpm --filter api run payments:reconcile-getnet-approved-manual -- \
 *     --payment-id <id> --remote-payment-id <uuid>
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
import { expectedTicketCountFromItems, isOrderTicketFulfillmentComplete } from '../src/modules/public-payments/order-fulfillment.util';
import { GetnetReconcileScriptModule } from './getnet-reconcile-script.module';

type ManualReconciliationMetadata = {
  manualReconciliation: {
    source: 'GETNET_PORTAL_MANUAL_CONFIRMATION';
    remoteStatus: 'APPROVED';
    confirmedAt: string;
    paymentIntentId: string;
    remotePaymentId: string;
    remoteCheckoutId?: string;
    authorizationCode?: string;
    note: string;
  };
};

type ScriptArgs = {
  dryRun: boolean;
  paymentId?: string;
  remotePaymentId?: string;
  remoteCheckoutId?: string;
  authorizationCode?: string;
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

function parseArgs(argv: string[]): ScriptArgs {
  const out: ScriptArgs = { dryRun: false };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      out.dryRun = true;
    } else if (a === '--payment-id' && argv[i + 1]) {
      out.paymentId = argv[++i];
    } else if (a === '--remote-payment-id' && argv[i + 1]) {
      out.remotePaymentId = argv[++i];
    } else if (a === '--remote-checkout-id' && argv[i + 1]) {
      out.remoteCheckoutId = argv[++i];
    } else if (a === '--authorization-code' && argv[i + 1]) {
      out.authorizationCode = argv[++i];
    } else if (a === '--help' || a === '-h') {
      console.log(`Usage:
  payments:reconcile-getnet-approved-manual -- \\
    --payment-id <paymentId> \\
    --remote-payment-id <getnetPaymentUuid> \\
    [--remote-checkout-id <checkoutId>] \\
    [--authorization-code <code>] \\
    [--dry-run]

Live requires: CONFIRM_GETNET_APPROVED_MANUAL=yes`);
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

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function extractManualReconciliation(metadata: unknown): Record<string, unknown> | null {
  const meta = readMetadataRecord(metadata);
  const manual = meta.manualReconciliation;
  if (!manual || typeof manual !== 'object' || Array.isArray(manual)) {
    return null;
  }
  return manual as Record<string, unknown>;
}

function isPartialResumeState(input: {
  paymentStatus: string;
  orderStatus: string;
  existingTickets: number;
  expectedTickets: number;
}): boolean {
  return (
    input.paymentStatus === 'APPROVED' &&
    (input.orderStatus === 'EXPIRED' || input.orderStatus === 'PENDING_PAYMENT') &&
    !isOrderTicketFulfillmentComplete(
      input.existingTickets,
      input.expectedTickets,
    )
  );
}

function printPartialFailureHint() {
  console.error(
    '\nPayment may be APPROVED but fulfillment incomplete. Re-run after fix in resume mode.',
  );
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv.slice(2));

  if (!args.paymentId?.trim()) {
    fail('--payment-id is required');
  }

  const paymentId = args.paymentId.trim();
  const remotePaymentId = args.remotePaymentId?.trim();
  const remoteCheckoutId = args.remoteCheckoutId?.trim();
  const authorizationCode = args.authorizationCode?.trim();

  if (args.dryRun) {
    console.log('MODE: DRY-RUN — no database mutations');
  } else {
    if (process.env.CONFIRM_GETNET_APPROVED_MANUAL !== 'yes') {
      fail(
        'Live reconciliation blocked. Set CONFIRM_GETNET_APPROVED_MANUAL=yes',
      );
    }
    if (!remotePaymentId) {
      fail('--remote-payment-id is required for live reconciliation');
    }
    console.log('MODE: LIVE — will mutate database via domain services');
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
        order: {
          include: {
            orderItems: {
              include: { ticketType: true },
            },
          },
        },
      },
    });

    if (!payment) {
      fail(`Payment not found: ${paymentId}`);
    }

    const risks: string[] = [];
    const abortConditions: string[] = [];

    console.log('\n--- payment ---');
    console.log(`id: ${payment.id}`);
    console.log(`provider: ${payment.provider}`);
    console.log(`status: ${payment.status}`);
    console.log(`orderId: ${payment.orderId ?? '(none)'}`);

    if (payment.provider !== 'GETNET') {
      abortConditions.push(`provider is ${payment.provider}, expected GETNET`);
    }

    if (!isWebCheckoutPaymentMetadata(payment.metadata)) {
      abortConditions.push('metadata.getnetIntegration must be "webcheckout"');
    }

    const paymentIntentId = extractPaymentIntentId(payment.metadata);
    if (!paymentIntentId) {
      abortConditions.push('metadata.paymentIntentId is missing');
    }

    if (!payment.orderId) {
      abortConditions.push('payment.orderId is missing');
    }

    const order = payment.order;
    if (!order) {
      abortConditions.push('order record not found');
    }

    const manualReconciliation = extractManualReconciliation(payment.metadata);
    let expectedTickets = 0;
    let existingTickets = 0;

    if (order) {
      expectedTickets = expectedTicketCountFromItems(order.orderItems);
      existingTickets = await prisma.ticket.count({
        where: { orderId: order.id, source: 'ORDER' },
      });
    }

    const partialResume = Boolean(
      order &&
        isPartialResumeState({
          paymentStatus: payment.status,
          orderStatus: order.status,
          existingTickets,
          expectedTickets,
        }),
    );

    const alreadyFulfilled = Boolean(
      order &&
        payment.status === 'APPROVED' &&
        order.status === 'PAID' &&
        isOrderTicketFulfillmentComplete(existingTickets, expectedTickets),
    );

    if (alreadyFulfilled) {
      console.log('\n--- idempotency ---');
      console.log('Payment APPROVED, order PAID, tickets complete — nothing to do');
      return;
    }

    if (partialResume) {
      console.log('\n--- partial resume detected ---');
      console.log(
        'Payment APPROVED but order/tickets incomplete — will resume fulfillment',
      );
      if (
        !manualReconciliation ||
        manualReconciliation.source !== 'GETNET_PORTAL_MANUAL_CONFIRMATION'
      ) {
        abortConditions.push(
          'Payment APPROVED partial state requires metadata.manualReconciliation.source = GETNET_PORTAL_MANUAL_CONFIRMATION',
        );
      }
    } else if (payment.status === 'APPROVED') {
      console.log('\n--- idempotency ---');
      console.log('Payment APPROVED — checking whether fulfillment can proceed');
    } else if (payment.status !== 'PENDING') {
      abortConditions.push(
        `payment status is ${payment.status}; expected PENDING or APPROVED`,
      );
    }

    if (order) {
      console.log('\n--- order ---');
      console.log(`id: ${order.id}`);
      console.log(`status: ${order.status}`);

      if (
        order.status !== 'EXPIRED' &&
        order.status !== 'PENDING_PAYMENT'
      ) {
        if (order.status === 'PAID' && !partialResume) {
          if (existingTickets > 0) {
            abortConditions.push(
              `order PAID with ${existingTickets} tickets — duplicate risk`,
            );
          }
        } else if (order.status !== 'PAID') {
          abortConditions.push(
            `order status is ${order.status}; expected EXPIRED or PENDING_PAYMENT`,
          );
        }
      }

      if (order.orderItems.length === 0) {
        abortConditions.push('order has no orderItems');
      }

      console.log('\n--- order items ---');
      for (const oi of order.orderItems) {
        console.log(
          `  item ${oi.id}: qty=${oi.quantity} ticketTypeId=${oi.ticketTypeId} batchId=${oi.ticketBatchId ?? 'null'} subtotal=${oi.subtotal}`,
        );

        if (oi.quantity <= 0) {
          abortConditions.push(`orderItem ${oi.id} has quantity <= 0`);
        }

        if (!oi.ticketType) {
          abortConditions.push(`ticketType ${oi.ticketTypeId} not found`);
        }

        if (oi.ticketBatchId) {
          const batch = await prisma.ticketBatch.findUnique({
            where: { id: oi.ticketBatchId },
          });
          if (!batch) {
            abortConditions.push(`ticketBatch ${oi.ticketBatchId} not found`);
          } else {
            const available =
              batch.effectiveQuantity - batch.soldCount - batch.reservedQuantity;
            console.log(
              `    batch ${batch.id}: available=${available} (eff=${batch.effectiveQuantity} sold=${batch.soldCount} reserved=${batch.reservedQuantity})`,
            );
            if (available < oi.quantity) {
              abortConditions.push(
                `insufficient batch stock for item ${oi.id} (need ${oi.quantity}, available ${available})`,
              );
              risks.push('Batch stock may have been consumed after expiration');
            }
          }
        }
      }

      console.log('\n--- tickets ---');
      console.log(`existing: ${existingTickets}`);
      console.log(`expected: ${expectedTickets}`);

      if (existingTickets >= expectedTickets && expectedTickets > 0) {
        abortConditions.push(
          `tickets already complete (${existingTickets}/${expectedTickets}) — would duplicate`,
        );
      } else if (existingTickets > 0) {
        risks.push(
          `Partial tickets exist (${existingTickets}/${expectedTickets}) — resume will fulfill remainder`,
        );
      }
    }

    if (order?.status === 'EXPIRED') {
      risks.push(
        'Order expired — batch reservations were released; fulfillment uses direct batch sale',
      );
    }

    const plannedAction =
      abortConditions.length > 0
        ? 'ABORT'
        : partialResume
          ? args.dryRun
            ? 'DRY-RUN resume fulfillment (APPROVED + EXPIRED + incomplete tickets)'
            : 'LIVE resume: fulfill only (no re-approve payment)'
          : payment.status === 'APPROVED'
            ? 'FULFILL incomplete approved payment'
            : args.dryRun
              ? 'DRY-RUN reconcile with remoteStatus=APPROVED + forceExpiredApprovedFulfillment'
              : 'LIVE: metadata manualReconciliation → reconcile → fulfill';

    console.log('\n--- planned action ---');
    console.log(plannedAction);
    console.log(`paymentIntentId: ${paymentIntentId ?? 'n/a'}`);
    if (remotePaymentId) console.log(`remotePaymentId: ${remotePaymentId}`);
    if (remoteCheckoutId) console.log(`remoteCheckoutId: ${remoteCheckoutId}`);
    if (authorizationCode) console.log(`authorizationCode: (set)`);

    if (risks.length > 0) {
      console.log('\n--- risks ---');
      for (const r of risks) console.log(`  - ${r}`);
    }

    if (abortConditions.length > 0) {
      console.log('\n--- abort conditions ---');
      for (const c of abortConditions) console.log(`  - ${c}`);
      fail('Validation failed — see abort conditions');
    }

    if (args.dryRun) {
      const result = await reconciliation.reconcilePayment(paymentId, {
        source: 'GETNET_PORTAL_MANUAL_CONFIRMATION',
        dryRun: true,
        remoteStatusOverride: 'APPROVED',
        forceExpiredApprovedFulfillment: true,
      });
      console.log('\n--- dry-run reconcile result ---');
      console.log(JSON.stringify(result, null, 2));
      console.log(
        '\nTo apply live: CONFIRM_GETNET_APPROVED_MANUAL=yes with --remote-payment-id',
      );
      return;
    }

    let metadataUpdated = false;
    const existingManual = extractManualReconciliation(payment.metadata);
    const shouldWriteMetadata =
      payment.status === 'PENDING' ||
      !existingManual ||
      existingManual.source !== 'GETNET_PORTAL_MANUAL_CONFIRMATION';

    if (shouldWriteMetadata) {
      const confirmedAt = new Date().toISOString();
      const manualPatch: ManualReconciliationMetadata = {
        manualReconciliation: {
          source: 'GETNET_PORTAL_MANUAL_CONFIRMATION',
          remoteStatus: 'APPROVED',
          confirmedAt,
          paymentIntentId: paymentIntentId!,
          remotePaymentId: remotePaymentId!,
          ...(remoteCheckoutId ? { remoteCheckoutId } : {}),
          ...(authorizationCode ? { authorizationCode } : {}),
          note: 'Confirmed approved in Getnet portal after webhook schema bug',
        },
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
      metadataUpdated = true;
    } else {
      console.log('\n--- metadata ---');
      console.log('manualReconciliation already present — skipping metadata write');
    }

    let result;
    try {
      result = await reconciliation.reconcilePayment(paymentId, {
        source: 'GETNET_PORTAL_MANUAL_CONFIRMATION',
        dryRun: false,
        remoteStatusOverride: 'APPROVED',
        forceExpiredApprovedFulfillment: true,
      });
    } catch (err) {
      if (metadataUpdated || partialResume) {
        printPartialFailureHint();
      }
      throw err;
    }

    console.log('\n--- reconcile result ---');
    console.log(JSON.stringify(result, null, 2));

    const refreshed = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        status: true,
        metadata: true,
        order: { select: { status: true } },
      },
    });
    const ticketCount = await prisma.ticket.count({
      where: { orderId: order!.id, source: 'ORDER' },
    });

    console.log('\n--- post-check ---');
    console.log(`payment.status: ${refreshed?.status ?? 'n/a'}`);
    console.log(`order.status: ${refreshed?.order?.status ?? 'n/a'}`);
    console.log(`tickets: ${ticketCount}/${expectedTickets}`);
    const meta = readMetadataRecord(refreshed?.metadata);
    const manual = meta.manualReconciliation;
    console.log(
      `manualReconciliation: ${manual ? 'present' : 'MISSING'}`,
    );
    console.log(
      `lastReconciliationOutcome: ${meta.lastReconciliationOutcome ?? '(empty)'}`,
    );

    if (
      refreshed?.status === 'APPROVED' &&
      refreshed.order?.status !== 'PAID' &&
      ticketCount < expectedTickets
    ) {
      printPartialFailureHint();
      fail('Fulfillment incomplete after reconcile');
    }
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  printPartialFailureHint();
  process.exit(1);
});
