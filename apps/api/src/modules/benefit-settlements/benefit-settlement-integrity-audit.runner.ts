import type {
  BenefitIntegrityIssue,
  BenefitIntegrityStatus,
  BenefitReportingIntegrityResponse,
} from '@yo-te-invito/shared';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import { CourtesyCreditLedgerService } from '../courtesy-credit-ledger/courtesy-credit-ledger.service';
import { BenefitSettlementEligibilityService } from './benefit-settlement-eligibility.service';
import { BenefitSettlementIntegrityService } from './benefit-settlement-integrity.service';
import { BenefitSettlementReportingService } from './benefit-settlement-reporting.service';
import { BenefitSettlementsService } from './benefit-settlements.service';

/**
 * G10.E1 — read-only, tenant-wide integrity audit (CLI `benefit-settlements:audit-integrity`).
 * EN: runs exactly the checks of `GET /admin/benefit-reporting/integrity` (settlement checks +
 *     `agreementScopeIssues`) over every page. Never writes, never repairs corrupt rows.
 * ES: ejecuta los mismos chequeos que el endpoint de integridad, en todas las páginas.
 *     Nunca escribe ni corrige filas corruptas.
 */

const PAGE_SIZE = 100;

export type BenefitIntegrityAuditRow = BenefitReportingIntegrityResponse['data'][number];

export type BenefitIntegrityAuditTenantResult = {
  tenantId: string;
  status: BenefitIntegrityStatus;
  checked: number;
  ok: number;
  warnings: number;
  errors: number;
  issueCounts: Record<string, number>;
  /** Only settlements with WARNING / ERROR. */
  settlementsWithIssues: BenefitIntegrityAuditRow[];
  agreementScopeIssues: BenefitIntegrityIssue[];
};

export type BenefitIntegrityAuditResult = {
  status: BenefitIntegrityStatus;
  tenants: BenefitIntegrityAuditTenantResult[];
};

function buildReadOnlyReporting(prisma: PrismaService): BenefitSettlementReportingService {
  const audit = {
    logAction: async () => {
      throw new Error('integrity audit is read-only: no audit log may be written');
    },
  } as unknown as AuditService;
  const ledger = new CourtesyCreditLedgerService(prisma, audit);
  const settlements = new BenefitSettlementsService(
    prisma,
    audit,
    new BenefitSettlementEligibilityService(prisma),
    ledger,
  );
  return new BenefitSettlementReportingService(
    prisma,
    settlements,
    new BenefitSettlementIntegrityService(prisma),
    ledger,
  );
}

function worst(statuses: BenefitIntegrityStatus[]): BenefitIntegrityStatus {
  if (statuses.includes('ERROR')) return 'ERROR';
  if (statuses.includes('WARNING')) return 'WARNING';
  return 'OK';
}

async function auditTenant(
  reporting: BenefitSettlementReportingService,
  tenantId: string,
): Promise<BenefitIntegrityAuditTenantResult> {
  const result: BenefitIntegrityAuditTenantResult = {
    tenantId,
    status: 'OK',
    checked: 0,
    ok: 0,
    warnings: 0,
    errors: 0,
    issueCounts: {},
    settlementsWithIssues: [],
    agreementScopeIssues: [],
  };
  for (let page = 1; ; page += 1) {
    const res = await reporting.getIntegrity(tenantId, { page, pageSize: PAGE_SIZE });
    if (page === 1) result.agreementScopeIssues = res.agreementScopeIssues ?? [];
    result.checked += res.checked;
    result.ok += res.ok;
    result.warnings += res.warnings;
    result.errors += res.errors;
    for (const row of res.data) {
      if (row.integrityStatus !== 'OK') result.settlementsWithIssues.push(row);
      for (const issue of row.issues) {
        result.issueCounts[issue.code] = (result.issueCounts[issue.code] ?? 0) + 1;
      }
    }
    if (page * PAGE_SIZE >= res.total) break;
  }
  for (const issue of result.agreementScopeIssues) {
    result.issueCounts[issue.code] = (result.issueCounts[issue.code] ?? 0) + 1;
  }
  const agreementStatus: BenefitIntegrityStatus = result.agreementScopeIssues.some((i) => i.severity === 'ERROR')
    ? 'ERROR'
    : result.agreementScopeIssues.length > 0
      ? 'WARNING'
      : 'OK';
  result.status = worst([
    result.errors > 0 ? 'ERROR' : result.warnings > 0 ? 'WARNING' : 'OK',
    agreementStatus,
  ]);
  return result;
}

export async function runBenefitIntegrityAudit(
  prisma: PrismaService,
  opts: { tenantId?: string } = {},
): Promise<BenefitIntegrityAuditResult> {
  const reporting = buildReadOnlyReporting(prisma);
  const tenantIds = opts.tenantId
    ? [opts.tenantId]
    : (await prisma.tenant.findMany({ select: { id: true }, orderBy: { id: 'asc' } })).map((t) => t.id);
  const tenants: BenefitIntegrityAuditTenantResult[] = [];
  for (const tenantId of tenantIds) {
    tenants.push(await auditTenant(reporting, tenantId));
  }
  return { status: worst(tenants.map((t) => t.status)), tenants };
}
