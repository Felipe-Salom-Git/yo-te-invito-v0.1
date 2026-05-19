import { Injectable } from '@nestjs/common';
import { Prisma, type TicketBatch } from '@prisma/client';

type Tx = Prisma.TransactionClient;

function blocksSuccessor(
  b: Pick<TicketBatch, 'status' | 'effectiveQuantity' | 'soldCount' | 'reservedQuantity' | 'endAt'>,
  now: Date,
): boolean {
  if (b.status === 'CLOSED' || b.status === 'SKIPPED' || b.status === 'SOLD_OUT') {
    return false;
  }
  if (now.getTime() > b.endAt.getTime()) return false;
  const rem = b.effectiveQuantity - b.soldCount - b.reservedQuantity;
  return rem > 0;
}

/** First batch that can sell now (sequential tandas, optional early open when prior drained). */
export function pickActiveBatch(batches: TicketBatch[], now: Date): TicketBatch | null {
  const sorted = [...batches].sort((a, b) => a.orderIndex - b.orderIndex);
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    if (b.status === 'CLOSED' || b.status === 'SKIPPED') continue;
    if (now.getTime() > b.endAt.getTime()) continue;
    const rem = b.effectiveQuantity - b.soldCount - b.reservedQuantity;
    if (rem <= 0) continue;
    const blocked = sorted.slice(0, i).some((j) => blocksSuccessor(j, now));
    if (blocked) continue;
    return b;
  }
  return null;
}

@Injectable()
export class TicketBatchService {
  /**
   * Expired batches → CLOSED + rollover remainder to next batch.
   * ACTIVE with no remaining → SOLD_OUT (in window).
   * SCHEDULED in window with stock → ACTIVE.
   */
  async reconcileTicketType(tx: Tx, ticketTypeId: string, now: Date): Promise<void> {
    let batches = await tx.ticketBatch.findMany({
      where: { ticketTypeId },
      orderBy: { orderIndex: 'asc' },
    });
    if (batches.length === 0) return;

    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      if (b.status === 'CLOSED' || b.status === 'SKIPPED') continue;
      if (now.getTime() <= b.endAt.getTime()) continue;

      const remainder = Math.max(0, b.effectiveQuantity - b.soldCount - b.reservedQuantity);
      const next = batches[i + 1];
      if (remainder > 0 && next) {
        const newRollover = next.rolloverQuantity + remainder;
        const newEffective = next.baseQuantity + newRollover;
        await tx.ticketBatch.update({
          where: { id: next.id },
          data: {
            rolloverQuantity: newRollover,
            effectiveQuantity: newEffective,
          },
        });
        batches[i + 1] = {
          ...next,
          rolloverQuantity: newRollover,
          effectiveQuantity: newEffective,
        };
      }
      await tx.ticketBatch.update({
        where: { id: b.id },
        data: { status: 'CLOSED' },
      });
      batches[i] = { ...b, status: 'CLOSED' };
    }

    batches = await tx.ticketBatch.findMany({
      where: { ticketTypeId },
      orderBy: { orderIndex: 'asc' },
    });

    for (const b of batches) {
      const rem = b.effectiveQuantity - b.soldCount - b.reservedQuantity;
      if (
        rem <= 0 &&
        b.status === 'ACTIVE' &&
        now.getTime() <= b.endAt.getTime()
      ) {
        await tx.ticketBatch.update({
          where: { id: b.id },
          data: { status: 'SOLD_OUT' },
        });
      }
    }

    batches = await tx.ticketBatch.findMany({
      where: { ticketTypeId },
      orderBy: { orderIndex: 'asc' },
    });

    for (const b of batches) {
      if (b.status !== 'SCHEDULED') continue;
      if (now.getTime() < b.startAt.getTime()) continue;
      if (now.getTime() > b.endAt.getTime()) continue;
      const rem = b.effectiveQuantity - b.soldCount - b.reservedQuantity;
      if (rem > 0) {
        await tx.ticketBatch.update({
          where: { id: b.id },
          data: { status: 'ACTIVE' },
        });
      }
    }
  }

  async reserveForPurchase(
    tx: Tx,
    params: { ticketTypeId: string; quantity: number },
    now: Date,
  ): Promise<{ batchId: string; unitPrice: Prisma.Decimal; currency: string }> {
    await this.reconcileTicketType(tx, params.ticketTypeId, now);
    const batches = await tx.ticketBatch.findMany({
      where: { ticketTypeId: params.ticketTypeId },
      orderBy: { orderIndex: 'asc' },
    });
    const active = pickActiveBatch(batches, now);
    if (!active) {
      throw Object.assign(new Error('NO_ACTIVE_BATCH'), { code: 'NO_ACTIVE_BATCH' });
    }

    const n = await tx.$executeRaw(
      Prisma.sql`
        UPDATE "TicketBatch"
        SET "reservedQuantity" = "reservedQuantity" + ${params.quantity}
        WHERE "id" = ${active.id}
          AND ("effectiveQuantity" - "soldCount" - "reservedQuantity") >= ${params.quantity}
      `,
    );
    if (n !== 1) {
      throw Object.assign(new Error('INSUFFICIENT_BATCH_STOCK'), {
        code: 'INSUFFICIENT_BATCH_STOCK',
      });
    }

    const updated = await tx.ticketBatch.findUniqueOrThrow({
      where: { id: active.id },
    });
    return {
      batchId: updated.id,
      unitPrice: updated.price,
      currency: updated.currency,
    };
  }

  async releaseReservation(
    tx: Tx,
    ticketBatchId: string | null,
    quantity: number,
  ): Promise<void> {
    if (quantity <= 0) return;
    if (ticketBatchId) {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "TicketBatch"
          SET "reservedQuantity" = "reservedQuantity" - ${quantity}
          WHERE "id" = ${ticketBatchId}
            AND "reservedQuantity" >= ${quantity}
        `,
      );
    }
  }

  async confirmReservedAsSold(
    tx: Tx,
    ticketBatchId: string | null,
    quantity: number,
  ): Promise<void> {
    if (quantity <= 0 || !ticketBatchId) return;
    const n = await tx.$executeRaw(
      Prisma.sql`
        UPDATE "TicketBatch"
        SET "reservedQuantity" = "reservedQuantity" - ${quantity},
            "soldCount" = "soldCount" + ${quantity}
        WHERE "id" = ${ticketBatchId}
          AND "reservedQuantity" >= ${quantity}
      `,
    );
    if (n !== 1) {
      throw Object.assign(new Error('BATCH_RESERVE_MISMATCH'), {
        code: 'BATCH_RESERVE_MISMATCH',
      });
    }
  }

  /** Courtesy / immediate sale: no pending reservation on the order flow. */
  async consumeFromActiveBatch(
    tx: Tx,
    ticketTypeId: string,
    quantity: number,
    now: Date,
  ): Promise<{ batchId: string }> {
    await this.reconcileTicketType(tx, ticketTypeId, now);
    const batches = await tx.ticketBatch.findMany({
      where: { ticketTypeId },
      orderBy: { orderIndex: 'asc' },
    });
    const active = pickActiveBatch(batches, now);
    if (!active) {
      throw Object.assign(new Error('NO_ACTIVE_BATCH'), { code: 'NO_ACTIVE_BATCH' });
    }
    const n = await tx.$executeRaw(
      Prisma.sql`
        UPDATE "TicketBatch"
        SET "soldCount" = "soldCount" + ${quantity}
        WHERE "id" = ${active.id}
          AND ("effectiveQuantity" - "soldCount" - "reservedQuantity") >= ${quantity}
      `,
    );
    if (n !== 1) {
      throw Object.assign(new Error('INSUFFICIENT_BATCH_STOCK'), {
        code: 'INSUFFICIENT_BATCH_STOCK',
      });
    }
    return { batchId: active.id };
  }
}
