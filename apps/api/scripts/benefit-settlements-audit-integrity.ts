/**
 * READ-ONLY benefit settlement integrity audit (same checks as GET /admin/benefit-reporting/integrity).
 *
 * Usage:
 *   pnpm --filter api run benefit-settlements:audit-integrity
 *   ... -- --tenant <tenantId>   # limit to one tenant
 *   ... -- --json                # machine-readable report
 *
 * Exit code: 0 = OK / WARNING · 2 = at least one ERROR issue · 1 = crash / DB unavailable.
 * Never writes and never repairs corrupt rows.
 */
import { PrismaService } from '../src/prisma/prisma.service';
import { runBenefitIntegrityAudit } from '../src/modules/benefit-settlements/benefit-settlement-integrity-audit.runner';

function parseArgs(argv: string[]) {
  const tenantIdx = argv.indexOf('--tenant');
  return {
    json: argv.includes('--json'),
    tenantId: tenantIdx >= 0 ? argv[tenantIdx + 1] : undefined,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaService();
  try {
    await prisma.$connect();
  } catch (err) {
    console.error('DB integration: NO EJECUTADO — PostgreSQL no disponible');
    console.error(String(err));
    process.exitCode = 1;
    return;
  }
  try {
    const result = await runBenefitIntegrityAudit(prisma, { tenantId: args.tenantId });
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\nBenefit integrity audit (read-only)${args.tenantId ? ` — tenant ${args.tenantId}` : ''}\n`);
      for (const t of result.tenants) {
        console.log(
          `tenant ${t.tenantId}: ${t.status} · settlements checked ${t.checked} (ok ${t.ok}, warnings ${t.warnings}, errors ${t.errors})` +
            ` · agreementScopeIssues ${t.agreementScopeIssues.length}`,
        );
        for (const [code, count] of Object.entries(t.issueCounts)) console.log(`  ${code}: ${count}`);
        for (const issue of t.agreementScopeIssues) {
          console.log(`  [${issue.severity}] ${issue.code} ${issue.entityType ?? ''} ${issue.entityId ?? ''} — ${issue.message}`);
        }
        for (const row of t.settlementsWithIssues) {
          for (const issue of row.issues) {
            console.log(`  [${issue.severity}] ${issue.code} settlement ${row.settlementId} (${row.periodKey}) — ${issue.message}`);
          }
        }
      }
      console.log(`\nRESULT: ${result.status}`);
    }
    if (result.status === 'ERROR') process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
