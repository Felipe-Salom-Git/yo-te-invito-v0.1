/**
 * Shared in-memory fake used by the G8.3 / G8.4 courtesy tests (no PostgreSQL needed).
 *
 * It implements ONLY the Prisma surface the courtesy flow touches, with a generic `where`
 * matcher (equality, `{ in }`, `{ not: null }`, `null`, `OR`, `AND`) so the tests exercise
 * the real services (owner create → admin approve/reject → delivery → /me → scanner) and
 * the real tenant / gastroProfile scoping of each query. `$transaction` snapshots the state
 * and restores it when the callback throws, so atomicity is observable.
 *
 * NOT a replacement for DB integration tests (see docs: "DB integration: NO EJECUTADO").
 */
import { ForbiddenException } from '@nestjs/common';
import { buildGastroDiscountQrPayload } from '@yo-te-invito/shared';
import { GastroCourtesyDiscountsService } from '../../src/modules/gastro/gastro-courtesy-discounts.service';
import { GastroCourtesyDeliveryService } from '../../src/modules/gastro/gastro-courtesy-delivery.service';
import { GastroDiscountClaimEmailService } from '../../src/modules/gastro/gastro-discount-claim-email.service';
import { GastroDiscountMetricsService } from '../../src/modules/gastro/gastro-discount-metrics.service';
import { AdminGastroService } from '../../src/modules/admin/admin-gastro.service';
import { MeGastroDiscountsService } from '../../src/modules/me/me-gastro-discounts.service';
import { PublicGastroDiscountsService } from '../../src/public/public-gastro-discounts.service';
import { ScannerGastroDiscountService } from '../../src/scanner/scanner-gastro-discount.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export const TENANT = 't1';
export const FUTURE_TO = '2027-06-30T23:59:59.000Z';

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue;
    if (key === 'OR') {
      if (!(cond as Row[]).some((c) => matches(row, c))) return false;
      continue;
    }
    if (key === 'AND') {
      if (!(cond as Row[]).every((c) => matches(row, c))) return false;
      continue;
    }
    const value = row[key];
    if (cond === null) {
      if (value != null) return false;
    } else if (typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as Row;
      if ('in' in c) {
        if (!(c.in as unknown[]).includes(value)) return false;
      } else if ('not' in c) {
        if (c.not === null ? value == null : value === c.not) return false;
      } else if (!matches(value ?? {}, c)) {
        return false;
      }
    } else if (value !== cond) {
      return false;
    }
  }
  return true;
}

export class FakeCourtesyDb {
  profiles: Row[] = [];
  memberships: Row[] = [];
  users: Row[] = [];
  follows: Row[] = [];
  discounts: Row[] = [];
  campaigns: Row[] = [];
  claims: Row[] = [];
  validations: Row[] = [];
  audits: Row[] = [];
  /** gastroProfileIds that have a CURRENT commercial agreement. */
  agreements = new Set<string>();
  txCount = 0;
  /** Set to make the Nth claim creation fail (to prove the owner create is atomic). */
  failClaimCreateAt: number | null = null;
  private seq = 0;
  private claimCreates = 0;

  /** cuid-like ids (alphanumeric, valid for QR payloads). */
  id(prefix: string): string {
    this.seq += 1;
    return `cm${prefix}${String(this.seq).padStart(10, '0')}`;
  }

  private discountWithIncludes(row: Row): Row {
    return {
      ...row,
      gastroProfile: this.profiles.find((p) => p.id === row.gastroProfileId) ?? null,
      event: { category: 'gastro', deletedAt: null },
      courtesyCampaign: this.campaigns.find((c) => c.discountId === row.id) ?? null,
      visualTemplate: null,
    };
  }

  private claimWithIncludes(row: Row): Row {
    const discount = this.discounts.find((d) => d.id === row.discountId);
    return {
      ...row,
      discount: discount ? this.discountWithIncludes(discount) : null,
      validations: this.validations.filter((v) => v.claimId === row.id),
    };
  }

  readonly delegates = {
    gastroProfile: {
      findFirst: async ({ where }: { where: Row }) =>
        this.profiles.find((p) => matches(p, where)) ?? null,
      findUnique: async ({ where }: { where: Row }) =>
        this.profiles.find((p) => matches(p, where)) ?? null,
    },
    userGastroMembership: {
      findFirst: async ({ where }: { where: Row }) => {
        const m = this.memberships.find(
          (x) => x.userId === where.userId && x.profileId === where.profileId,
        );
        if (!m) return null;
        const profile = this.profiles.find((p) => p.id === m.profileId && p.status === 'ACTIVE');
        return profile ? { ...m, profile } : null;
      },
    },
    user: {
      findFirst: async ({ where }: { where: Row }) =>
        this.users.find((u) => matches(u, where)) ?? null,
    },
    userGastroFollow: {
      findMany: async ({ where }: { where: Row }) =>
        this.follows
          .filter((f) => f.tenantId === where.tenantId && f.gastroProfileId === where.gastroProfileId)
          .map((f) => ({ ...f, user: this.users.find((u) => u.id === f.userId) })),
      count: async ({ where }: { where: Row }) =>
        this.follows.filter(
          (f) => f.tenantId === where.tenantId && f.gastroProfileId === where.gastroProfileId,
        ).length,
    },
    gastroDiscount: {
      create: async ({ data }: { data: Row }) => {
        const row = {
          id: this.id('disc'),
          qrToken: null,
          emailSentAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        this.discounts.push(row);
        return { ...row };
      },
      findFirst: async ({ where }: { where: Row }) => {
        const row = this.discounts.find((d) => matches(d, where));
        return row ? this.discountWithIncludes(row) : null;
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = this.discounts.find((d) => d.id === where.id);
        if (!row) throw new Error('discount not found');
        Object.assign(row, data);
        return { ...row };
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const rows = this.discounts.filter((d) => matches(d, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
    },
    gastroCourtesyCampaign: {
      create: async ({ data }: { data: Row }) => {
        const row = { id: this.id('camp'), createdAt: new Date(), ...data };
        this.campaigns.push(row);
        return { ...row };
      },
      findFirst: async ({ where }: { where: Row }) =>
        this.campaigns.find((c) => matches(c, where)) ?? null,
    },
    gastroDiscountClaim: {
      create: async ({ data }: { data: Row }) => {
        this.claimCreates += 1;
        if (this.failClaimCreateAt != null && this.claimCreates === this.failClaimCreateAt) {
          throw new Error('simulated claim create failure');
        }
        const dup = this.claims.find(
          (c) => c.discountId === data.discountId && c.email === data.email,
        );
        if (dup) throw new Error('P2002 unique(discountId,email)');
        const row = {
          id: this.id('claim'),
          emailSentAt: null,
          emailSendError: null,
          usedAt: null,
          createdAt: new Date(2026, 9, 23, 0, 0, this.seq % 60),
          ...data,
        };
        this.claims.push(row);
        return { ...row };
      },
      findUnique: async ({ where }: { where: Row }) => {
        const row = this.claims.find((c) => {
          if (where.shortCode) return c.shortCode === where.shortCode;
          if (where.id) return c.id === where.id;
          return false;
        });
        return row ? { ...row } : null;
      },
      findFirst: async ({ where }: { where: Row }) => {
        const row = this.claims.find((c) => matches(c, where));
        return row ? this.claimWithIncludes(row) : null;
      },
      findMany: async ({ where }: { where: Row }) =>
        this.claims.filter((c) => matches(c, where)).map((c) => this.claimWithIncludes(c)),
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = this.claims.find((c) => c.id === where.id);
        if (!row) throw new Error('claim not found');
        Object.assign(row, data);
        return { ...row };
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const rows = this.claims.filter((c) => matches(c, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
      count: async ({ where }: { where: Row }) =>
        this.claims.filter((c) => matches(c, where)).length,
    },
    gastroDiscountValidation: {
      create: async ({ data }: { data: Row }) => {
        const row = { id: this.id('val'), validatedAt: new Date(), ...data };
        this.validations.push(row);
        return row;
      },
    },
    auditLog: {
      create: async ({ data }: { data: Row }) => {
        this.audits.push(data);
        return data;
      },
    },
  };

  get prisma() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      ...this.delegates,
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        self.txCount += 1;
        const snap = {
          discounts: self.discounts.map((r) => ({ ...r })),
          campaigns: self.campaigns.map((r) => ({ ...r })),
          claims: self.claims.map((r) => ({ ...r })),
          validations: self.validations.map((r) => ({ ...r })),
        };
        try {
          return await fn(self.prisma);
        } catch (e) {
          self.discounts = snap.discounts;
          self.campaigns = snap.campaigns;
          self.claims = snap.claims;
          self.validations = snap.validations;
          throw e;
        }
      },
    };
  }

  // ---- fixtures ------------------------------------------------------------
  addProfile(id: string, opts: Partial<Row> = {}) {
    this.profiles.push({
      id,
      tenantId: TENANT,
      displayName: `Local ${id}`,
      status: 'ACTIVE',
      publicEventId: `evt-${id}`,
      contactEmail: `${id}@example.com`,
      ...opts,
    });
  }

  addOwner(userId: string, profileId: string) {
    this.memberships.push({ userId, profileId, tenantId: TENANT, status: 'ACTIVE' });
  }

  addUser(id: string, email: string, firstName = 'Ana') {
    this.users.push({ id, tenantId: TENANT, email, firstName, lastName: 'Test', deletedAt: null });
  }

  /** A pre-G8.3 production courtesy: ACTIVE discount + ACTIVE claims, no approval history. */
  addLegacyActiveCourtesy(profileId: string, emails: string[]) {
    const discount = {
      id: this.id('disc'),
      tenantId: TENANT,
      eventId: `evt-${profileId}`,
      gastroProfileId: profileId,
      code: 'CRS-LEGACY',
      type: 'PERCENT',
      value: 0,
      displayTitle: 'Legacy',
      summary: 'Legacy',
      detail: 'Legacy',
      validityMode: 'DATE_RANGE',
      validWeekday: null,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validTo: new Date(FUTURE_TO),
      discountDate: new Date(FUTURE_TO),
      status: 'ACTIVE',
      visibility: 'COURTESY_ONLY',
      qrToken: null,
      createdByOrigin: 'GASTRO',
      pendingUpdate: null,
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    };
    this.discounts.push(discount);
    const campaign = {
      id: this.id('camp'),
      tenantId: TENANT,
      gastroProfileId: profileId,
      discountId: discount.id,
      title: 'Legacy',
      description: null,
      discountLabel: '2x1',
      message: null,
      validFrom: discount.validFrom,
      validTo: discount.validTo,
    };
    this.campaigns.push(campaign);
    const claims = emails.map((email, i) => {
      const claim = {
        id: this.id('claim'),
        tenantId: TENANT,
        discountId: discount.id,
        courtesyCampaignId: campaign.id,
        email,
        userId: null,
        recipientName: null,
        qrToken: `abcdef0${i}`.padEnd(48, 'a'),
        accessToken: `beef000${i}`.padEnd(64, 'b'),
        shortCode: `LEG${i}ABC`.slice(0, 6),
        type: 'COURTESY',
        source: 'MANUAL_EMAIL',
        status: 'ACTIVE',
        expiresAt: discount.validTo,
        usedAt: null,
        emailSentAt: new Date('2026-09-01T00:00:00.000Z'),
        emailSendError: null,
        createdAt: new Date(2026, 8, 1, 0, 0, i),
      };
      this.claims.push(claim);
      return claim;
    });
    return { discount, campaign, claims };
  }

  // ---- services under test -------------------------------------------------
  build(opts: { emailConfigured?: boolean; failEmailFor?: string[] } = {}) {
    const emailLog: Array<{ templateId: string; to: string; variables: Row }> = [];
    const alerts: string[] = [];
    const lifecycle = { approved: [] as string[], rejected: [] as string[] };
    const failEmailFor = new Set(opts.failEmailFor ?? []);
    const emailConfigured = opts.emailConfigured ?? true;
    const emailService = {
      isConfigured: () => emailConfigured,
      sendTemplateResult: async (input: { templateId: string; to: string; variables: Row }) => {
        if (failEmailFor.has(input.to)) {
          return { ok: false, errorCode: 'SMTP_ERROR', message: 'smtp down' };
        }
        emailLog.push(input);
        return { ok: true };
      },
      send: async () => true,
    };
    const auditService = {
      logAction: async (a: Row) => {
        this.audits.push(a);
      },
    };
    const prisma = this.prisma as never;
    const claimEmail = new GastroDiscountClaimEmailService(emailService as never, prisma);
    const delivery = new GastroCourtesyDeliveryService(
      prisma,
      claimEmail,
      emailService as never,
      auditService as never,
    );
    const agreements = {
      resolveApplicable: async (_t: string, q: { gastroProfileId?: string }) => ({
        agreement:
          q.gastroProfileId && this.agreements.has(q.gastroProfileId)
            ? { id: `agr-${q.gastroProfileId}` }
            : null,
      }),
    };
    const courtesy = new GastroCourtesyDiscountsService(
      prisma,
      { hasGastroAccess: async () => true } as never,
      auditService as never,
      emailService as never,
      { debitForGastroCourtesyCampaign: async () => ({ entry: { id: 'led-1', amountCents: 1n } }) } as never,
      agreements as never,
      delivery,
    );
    const admin = new AdminGastroService(
      prisma,
      emailService as never,
      {
        notifyFollowersOfNewActiveDiscount: async (_t: string, id: string) => {
          alerts.push(id);
        },
      } as never,
      {
        notifyDiscountApproved: (_t: string, id: string) => lifecycle.approved.push(id),
        notifyDiscountRejected: (_t: string, id: string) => lifecycle.rejected.push(id),
      } as never,
      agreements as never,
      delivery,
    );
    const me = new MeGastroDiscountsService(prisma);
    const publicSvc = new PublicGastroDiscountsService(prisma, claimEmail, auditService as never);
    const scanner = new ScannerGastroDiscountService(
      prisma,
      {} as never,
      {} as never,
      {} as never,
      auditService as never,
    );
    const metrics = new GastroDiscountMetricsService(prisma, auditService as never);
    return { courtesy, admin, delivery, me, publicSvc, scanner, metrics, emailLog, alerts, lifecycle };
  }

  /**
   * G8.5 — a real `ScannerGastroDiscountService` for a SCANNER account bound to one local
   * (`ScannerAccount.parentProfileId`), using the REAL scope helper. Pass the returned
   * `userId` + role 'SCANNER' to `validate`.
   */
  scannerFor(parentProfileId: string) {
    const auditService = { logAction: async (a: Row) => void this.audits.push(a) };
    const scannerAccounts = {
      assertScannerCanAccessGastroDiscount: async (
        tenantId: string,
        _scannerUserId: string,
        discountId: string,
      ) => {
        const d = this.discounts.find((x) => x.id === discountId && x.tenantId === tenantId);
        if (!d || d.gastroProfileId !== parentProfileId) {
          throw new ForbiddenException('scanner scope');
        }
      },
    };
    return new ScannerGastroDiscountService(
      this.prisma as never,
      {} as never,
      scannerAccounts as never,
      {} as never,
      auditService as never,
    );
  }

  qrFor(claim: Row): string {
    return buildGastroDiscountQrPayload(claim.discountId, claim.qrToken);
  }
}

export function sendBody(over: Record<string, unknown> = {}) {
  return {
    gastroProfileId: 'prof-a',
    title: 'Cena de cortesía',
    description: 'Una cena para dos',
    discountLabel: '20% en cena',
    validTo: FUTURE_TO,
    manualEmails: ['a@example.com', 'b@example.com', 'c@example.com'],
    sendToFollowers: false,
    ...over,
  } as never;
}

export async function errorOf(fn: () => Promise<unknown>): Promise<Error | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    return e as Error;
  }
}

export const codeOf = (e: Error | null): string | undefined =>
  e && 'getResponse' in e
    ? ((e as { getResponse(): { code?: string } }).getResponse() as { code?: string }).code
    : undefined;

export function makeChecker() {
  const state = { failures: 0 };
  return {
    state,
    check(cond: boolean, msg: string) {
      if (!cond) {
        state.failures += 1;
        console.error('FAIL:', msg);
      } else {
        console.log('OK:', msg);
      }
    },
  };
}
