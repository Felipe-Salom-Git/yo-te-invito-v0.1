import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

const SCAN_RATE_BURST_THRESHOLD = parseInt(
  process.env.FRAUD_SCAN_RATE_THRESHOLD ?? '20',
  10,
);
const SCAN_RATE_WINDOW_SEC = 10;
const REPEATED_VALID_SCAN_THRESHOLD = parseInt(
  process.env.FRAUD_REPEATED_VALID_THRESHOLD ?? '3',
  10,
);
const REPEATED_VALID_WINDOW_SEC = 5 * 60;
const INVALID_BURST_COUNT = parseInt(
  process.env.FRAUD_INVALID_BURST_COUNT ?? '30',
  10,
);
const INVALID_BURST_RATIO = parseFloat(
  process.env.FRAUD_INVALID_BURST_RATIO ?? '0.9',
);
const INVALID_BURST_WINDOW_SEC = 60;

const SIGNAL_TYPES = {
  SCAN_RATE_BURST: 'SCAN_RATE_BURST',
  REPEATED_VALID_SCAN: 'REPEATED_VALID_SCAN',
  INVALID_BURST: 'INVALID_BURST',
} as const;

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 */3 * * * *')
  handleFraudDetectionCron() {
    return this.runFraudDetectionJob();
  }

  async runFraudDetectionJob(): Promise<{ signalsCreated: number }> {
    const now = new Date();
    const lookback = new Date(now.getTime() - 10 * 60 * 1000);
    let signalsCreated = 0;

    const scans = await this.prisma.ticketScan.findMany({
      where: { createdAt: { gte: lookback } },
      orderBy: { createdAt: 'asc' },
    });

    if (scans.length === 0) return { signalsCreated: 0 };

    const byEvent = new Map<string, typeof scans>();
    for (const s of scans) {
      const list = byEvent.get(s.eventId) ?? [];
      list.push(s);
      byEvent.set(s.eventId, list);
    }

    for (const [eventId, eventScans] of byEvent) {
      const tenantId = eventScans[0]?.tenantId;
      if (!tenantId) continue;

      const existingKeys = new Set<string>();
      const getKey = (type: string, suffix: string) =>
        `${eventId}:${type}:${suffix}`;

      const byDeviceOrIpScans = new Map<string, typeof eventScans>();
      for (const s of eventScans) {
        const k = s.deviceId ?? s.ipAddress ?? 'unknown';
        const list = byDeviceOrIpScans.get(k) ?? [];
        list.push(s);
        byDeviceOrIpScans.set(k, list);
      }
      for (const [deviceOrIp, group] of byDeviceOrIpScans) {
        for (const s of group) {
          const windowStart = new Date(
            s.createdAt.getTime() - SCAN_RATE_WINDOW_SEC * 1000,
          );
          const windowEnd = s.createdAt;
          const count = group.filter(
            (x) => x.createdAt >= windowStart && x.createdAt <= windowEnd,
          ).length;
          if (count >= SCAN_RATE_BURST_THRESHOLD) {
            const bucket = Math.floor(windowStart.getTime() / 10000) * 10000;
            const key = getKey(SIGNAL_TYPES.SCAN_RATE_BURST, `${deviceOrIp}:${bucket}`);
            if (existingKeys.has(key)) continue;
            existingKeys.add(key);
            const sample = group.find((x) => x.deviceId || x.ipAddress) ?? group[0];
            await this.upsertSignal(
              tenantId,
              eventId,
              SIGNAL_TYPES.SCAN_RATE_BURST,
              sample?.deviceId ?? null,
              sample?.ipAddress ?? null,
              count,
              windowStart,
              windowEnd,
              { threshold: SCAN_RATE_BURST_THRESHOLD },
            );
            signalsCreated++;
            break;
          }
        }
      }

      const byTicket = new Map<string, typeof eventScans>();
      for (const s of eventScans) {
        if (s.ticketId && s.isValid) {
          const list = byTicket.get(s.ticketId) ?? [];
          list.push(s);
          byTicket.set(s.ticketId, list);
        }
      }
      for (const [ticketId, ticketScans] of byTicket) {
        if (ticketScans.length <= REPEATED_VALID_SCAN_THRESHOLD) continue;
        const minCreated = ticketScans.reduce(
          (a, b) => (a.createdAt < b.createdAt ? a : b),
        );
        const windowStart = new Date(
          minCreated.createdAt.getTime() - REPEATED_VALID_WINDOW_SEC * 1000,
        );
        const windowEnd = ticketScans.reduce(
          (a, b) => (a.createdAt > b.createdAt ? a : b),
        ).createdAt;
        const key = getKey(SIGNAL_TYPES.REPEATED_VALID_SCAN, ticketId);
        if (!existingKeys.has(key)) {
          await this.upsertSignal(
            tenantId,
            eventId,
            SIGNAL_TYPES.REPEATED_VALID_SCAN,
            null,
            null,
            ticketScans.length,
            windowStart,
            windowEnd,
            { ticketId },
          );
          existingKeys.add(key);
          signalsCreated++;
        }
      }

      const byDeviceOrIp = new Map<string, typeof eventScans>();
      for (const s of eventScans) {
        const k = s.deviceId ?? s.ipAddress ?? 'unknown';
        const list = byDeviceOrIp.get(k) ?? [];
        list.push(s);
        byDeviceOrIp.set(k, list);
      }
      for (const [k, group] of byDeviceOrIp) {
        const invalid = group.filter((x) => !x.isValid);
        if (invalid.length < INVALID_BURST_COUNT) continue;
        let found = false;
        for (const s of invalid) {
          const windowStart = new Date(
            s.createdAt.getTime() - INVALID_BURST_WINDOW_SEC * 1000,
          );
          const windowEnd = s.createdAt;
          const inWindow = group.filter(
            (x) => x.createdAt >= windowStart && x.createdAt <= windowEnd,
          );
          const invInWindow = inWindow.filter((x) => !x.isValid);
          if (invInWindow.length < INVALID_BURST_COUNT) continue;
          const ratio = invInWindow.length / inWindow.length;
          if (ratio < INVALID_BURST_RATIO) continue;
          const bucket = Math.floor(windowStart.getTime() / 60000) * 60000;
          const key = getKey(SIGNAL_TYPES.INVALID_BURST, `${k}:${bucket}`);
          if (existingKeys.has(key)) continue;
          existingKeys.add(key);
          found = true;
          const sample = inWindow[0];
          await this.upsertSignal(
            tenantId,
            eventId,
            SIGNAL_TYPES.INVALID_BURST,
            sample?.deviceId ?? null,
            sample?.ipAddress ?? null,
            invInWindow.length,
            windowStart,
            windowEnd,
            {
              totalScans: inWindow.length,
              invalidCount: invInWindow.length,
              ratio,
            },
          );
          signalsCreated++;
          break;
        }
      }
    }

    if (signalsCreated > 0) {
      this.logger.log(`Created ${signalsCreated} fraud signal(s)`);
    }

    return { signalsCreated };
  }

  private async upsertSignal(
    tenantId: string,
    eventId: string,
    signalType: string,
    deviceId: string | null,
    ipAddress: string | null,
    scanCount: number,
    windowStart: Date,
    windowEnd: Date,
    metadata: object,
  ): Promise<void> {
    await this.prisma.fraudSignal.create({
      data: {
        tenantId,
        eventId,
        signalType,
        deviceId,
        ipAddress,
        scanCount,
        windowStart,
        windowEnd,
        metadata: metadata as object,
      },
    });
  }
}
