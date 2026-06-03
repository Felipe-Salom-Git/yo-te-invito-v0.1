/**
 * Reconciliación operativa de pagos Getnet.
 *
 * Dry-run por defecto (no muta DB).
 *
 * Uso:
 *   pnpm --filter api run payments:reconcile-getnet
 *   pnpm --filter api run payments:reconcile-getnet -- --confirm --limit 20
 *   pnpm --filter api run payments:reconcile-getnet -- --payment-id <id> --dry-run
 */
import 'reflect-metadata';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from '../src/prisma/prisma.service';
import { GetnetReconciliationService } from '../src/modules/public-payments/getnet-reconciliation.service';
import { isGetnetRemoteConfigured } from '../src/modules/public-payments/getnet-reconciliation.remote.util';
import { GetnetReconcileScriptModule } from './getnet-reconcile-script.module';

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
  const out: {
    dryRun: boolean;
    confirm: boolean;
    limit: number;
    olderThanMinutes: number;
    tenantId?: string;
    paymentId?: string;
  } = {
    dryRun: true,
    confirm: false,
    limit: 50,
    olderThanMinutes: 10,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--confirm') {
      out.confirm = true;
      out.dryRun = false;
    } else if (a === '--dry-run') {
      out.dryRun = true;
      out.confirm = false;
    } else if (a === '--limit' && argv[i + 1]) {
      out.limit = parseInt(argv[++i], 10) || 50;
    } else if (a === '--older-than-minutes' && argv[i + 1]) {
      out.olderThanMinutes = parseInt(argv[++i], 10) || 10;
    } else if (a === '--tenant-id' && argv[i + 1]) {
      out.tenantId = argv[++i];
    } else if (a === '--payment-id' && argv[i + 1]) {
      out.paymentId = argv[++i];
    }
  }

  if (out.confirm && process.env.NODE_ENV === 'production') {
    const flag = process.env.GETNET_RECONCILE_CONFIRM_PROD;
    if (flag !== 'yes') {
      console.error(
        'En producción seteá GETNET_RECONCILE_CONFIRM_PROD=yes además de --confirm',
      );
      process.exit(1);
    }
  }

  return out;
}

function printSummary(
  label: string,
  summary: {
    reviewed: number;
    fulfilled: number;
    alreadyFulfilled: number;
    pending: number;
    rejected: number;
    requiresManualReview: number;
    skipped: number;
    errors: number;
    dryRun: boolean;
  },
) {
  console.log(`\n=== ${label} ===`);
  console.log(`dryRun: ${summary.dryRun}`);
  console.log(`reviewed: ${summary.reviewed}`);
  console.log(`fulfilled: ${summary.fulfilled}`);
  console.log(`alreadyFulfilled: ${summary.alreadyFulfilled}`);
  console.log(`pending: ${summary.pending}`);
  console.log(`rejected/cancelled/expired: ${summary.rejected}`);
  console.log(`requiresManualReview: ${summary.requiresManualReview}`);
  console.log(`skipped: ${summary.skipped}`);
  console.log(`errors: ${summary.errors}`);
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv.slice(2));

  if (!args.dryRun) {
    console.log('MODO CONFIRM — se mutará la base de datos');
  } else {
    console.log('MODO DRY-RUN — sin mutaciones');
  }

  if (!isGetnetRemoteConfigured()) {
    console.warn(
      'Getnet credentials missing (GETNET_CLIENT_ID / GETNET_CLIENT_SECRET); ' +
        'remote status checks will return REMOTE_STATUS_UNAVAILABLE.',
    );
    if (!args.dryRun) {
      console.error(
        'No se puede usar --confirm sin credenciales Getnet para consultar estado remoto.',
      );
      process.exit(1);
    }
  }

  const app = await NestFactory.createApplicationContext(
    GetnetReconcileScriptModule,
    {
      logger: ['error', 'warn'],
    },
  );

  try {
    const prisma = app.get(PrismaService);
    const reconciliation = app.get(GetnetReconciliationService);

    if (!prisma?.payment?.findMany) {
      throw new Error(
        'PrismaService is not available in script context. Check DATABASE_URL and Nest bootstrap.',
      );
    }
    reconciliation.assertDatabaseReady();

    if (args.paymentId) {
      const result = await reconciliation.reconcilePayment(args.paymentId, {
        source: 'GETNET_SCRIPT',
        dryRun: args.dryRun,
        tenantId: args.tenantId,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const summary = await reconciliation.reconcilePendingPayments({
      dryRun: args.dryRun,
      limit: args.limit,
      olderThanMinutes: args.olderThanMinutes,
      tenantId: args.tenantId,
      source: 'GETNET_SCRIPT',
    });

    printSummary('Getnet reconciliation batch', summary);
    if (summary.results.length > 0) {
      console.log('\nDetalle:');
      for (const r of summary.results) {
        console.log(
          `  ${r.paymentId} → ${r.outcome}${r.reconciliationReason ? ` (${r.reconciliationReason})` : ''}`,
        );
      }
    } else {
      console.log('\nSin pagos Getnet pendientes en el lote.');
    }
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
