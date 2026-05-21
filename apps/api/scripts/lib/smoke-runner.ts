/**
 * Runs a smoke test and cleans ephemeral DB artifacts unless SMOKE_SKIP_CLEANUP=1.
 */

import { PrismaClient } from '@prisma/client';
import {
  cleanupSmokeArtifacts,
  countSmokeArtifacts,
  printSmokeCleanupSummary,
} from './smoke-cleanup';

let prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

export async function smokeCleanupAfter(options?: {
  dryRun?: boolean;
  label?: string;
}): Promise<void> {
  if (process.env.SMOKE_SKIP_CLEANUP === '1') {
    console.log('[smoke] SMOKE_SKIP_CLEANUP=1 — skipping cleanup');
    return;
  }

  const client = getPrisma();
  const dryRun = options?.dryRun ?? false;
  if (dryRun) {
    const counts = await countSmokeArtifacts(client);
    printSmokeCleanupSummary(counts, true);
    return;
  }

  if (options?.label) console.log(`\n[smoke] cleanup after ${options.label}...`);
  const counts = await cleanupSmokeArtifacts(client, { dryRun: false });
  printSmokeCleanupSummary(counts, false);
}

export async function smokeCleanupBefore(): Promise<void> {
  if (process.env.SMOKE_CLEANUP_BEFORE !== '1') return;
  console.log('[smoke] SMOKE_CLEANUP_BEFORE=1 — pre-run cleanup');
  await smokeCleanupAfter({ label: 'pre-run' });
}

/** Runs fn, cleans up smoke artifacts, then exits (so cleanup always runs). */
export async function runSmokeScript(
  label: string,
  fn: () => Promise<number | void>,
): Promise<never> {
  let exitCode = 0;
  try {
    await smokeCleanupBefore();
    const code = await fn();
    if (typeof code === 'number') exitCode = code;
  } catch (e) {
    console.error(e);
    exitCode = 1;
  } finally {
    try {
      await smokeCleanupAfter({ label });
    } catch (cleanupErr) {
      console.error('[smoke] cleanup failed:', cleanupErr);
      exitCode = exitCode || 1;
    }
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
    }
  }
  process.exit(exitCode);
}
