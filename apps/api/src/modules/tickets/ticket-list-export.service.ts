import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import PDFDocument from 'pdfkit';
import {
  ErrorCode,
  Role,
  shortTicketCode,
  partialQrSuffix,
  type TicketListRow,
  type OfflineSnapshotResponse,
  type OfflineValidationSyncBody,
  type OfflineValidationSyncResponse,
  type OfflineValidationSyncItemResult,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ScannerAccountsService } from '../scanner-accounts/scanner-accounts.service';
import { createHash } from 'crypto';

type ExportActor = { id: string; tenantId: string; role: string };

function buyerDisplayName(input: {
  order?: { buyerFirstName: string; buyerLastName: string; buyerEmail: string } | null;
  ownerUser?: { firstName: string | null; lastName: string | null; email: string } | null;
}): string {
  if (input.order) {
    const name = `${input.order.buyerFirstName} ${input.order.buyerLastName}`.trim();
    if (name) return name;
    return input.order.buyerEmail;
  }
  if (input.ownerUser) {
    const name = `${input.ownerUser.firstName ?? ''} ${input.ownerUser.lastName ?? ''}`.trim();
    if (name) return name;
    return input.ownerUser.email;
  }
  return '—';
}

function validationStatusLabel(status: string, usedAt: Date | null): string {
  if (status === 'USED' || usedAt) return 'Validada';
  if (status === 'VALID') return 'Pendiente';
  if (status === 'REVOKED') return 'Revocada';
  if (status === 'TRANSFER_PENDING') return 'Transferencia pendiente';
  if (status === 'TRANSFERRED') return 'Transferida';
  return status;
}

function sortTicketRows(rows: TicketListRow[]): TicketListRow[] {
  return [...rows].sort((a, b) => {
    const typeCmp = a.ticketType.localeCompare(b.ticketType, 'es');
    if (typeCmp !== 0) return typeCmp;
    const buyerCmp = a.buyerName.localeCompare(b.buyerName, 'es');
    if (buyerCmp !== 0) return buyerCmp;
    return a.status.localeCompare(b.status, 'es');
  });
}

@Injectable()
export class TicketListExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scannerAccounts: ScannerAccountsService,
  ) {}

  async assertProducerCanExport(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
  ): Promise<{ id: string; title: string; startAt: Date | null }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true, title: true, startAt: true, producerId: true },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    const isAdmin = userRole === Role.ADMIN;
    const isOwner = event.producerId === userId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Not allowed to export tickets for this event',
      });
    }
    return event;
  }

  async assertScannerCanExport(
    tenantId: string,
    scannerUserId: string,
    eventId: string,
  ): Promise<{ id: string; title: string; startAt: Date | null }> {
    await this.scannerAccounts.assertScannerCanAccessEvent(tenantId, scannerUserId, eventId);
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true, title: true, startAt: true },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    return event;
  }

  private async fetchTicketRows(eventId: string): Promise<TicketListRow[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: { eventId },
      select: {
        id: true,
        status: true,
        qrPayload: true,
        usedAt: true,
        ticketType: { select: { name: true } },
        order: {
          select: { buyerFirstName: true, buyerLastName: true, buyerEmail: true },
        },
        ownerUser: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    return tickets.map((t) => ({
      ticketId: t.id,
      buyerName: buyerDisplayName({ order: t.order, ownerUser: t.ownerUser }),
      ticketType: t.ticketType?.name ?? 'Entrada',
      status: t.status,
      code: shortTicketCode(t.id),
      validationStatus: validationStatusLabel(t.status, t.usedAt),
      codeSuffix: partialQrSuffix(t.qrPayload),
    }));
  }

  async buildPdfBuffer(
    event: { title: string; startAt: Date | null },
    rows: TicketListRow[],
    generatedAt: Date,
  ): Promise<Buffer> {
    const sorted = sortTicketRows(rows);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(16).text('Yo Te Invito', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text('Listado de control interno', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(`Evento: ${event.title}`);
    doc.text(
      `Fecha evento: ${
        event.startAt
          ? event.startAt.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
          : '—'
      }`,
    );
    doc.text(
      `Generado: ${generatedAt.toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}`,
    );
    doc.text(`Total entradas: ${sorted.length}`);
    doc.moveDown();

    if (sorted.length === 0) {
      doc.text('No hay entradas emitidas para este evento.');
    } else {
      const cols = [
        { label: 'Tipo', x: 40, w: 85 },
        { label: 'Comprador', x: 128, w: 115 },
        { label: 'Estado', x: 246, w: 52 },
        { label: 'Código', x: 302, w: 48 },
        { label: 'Validación', x: 354, w: 58 },
        { label: 'Ref.', x: 416, w: 50 },
      ];
      let y = doc.y;
      doc.fontSize(8).font('Helvetica-Bold');
      for (const c of cols) {
        doc.text(c.label, c.x, y, { width: c.w });
      }
      y += 14;
      doc.moveTo(40, y).lineTo(555, y).stroke();
      y += 6;
      doc.font('Helvetica');

      for (const row of sorted) {
        if (y > 760) {
          doc.addPage();
          y = 40;
        }
        doc.fontSize(7);
        doc.text(row.ticketType.slice(0, 20), cols[0]!.x, y, { width: cols[0]!.w });
        doc.text(row.buyerName.slice(0, 24), cols[1]!.x, y, { width: cols[1]!.w });
        doc.text(row.status, cols[2]!.x, y, { width: cols[2]!.w });
        doc.text(row.code, cols[3]!.x, y, { width: cols[3]!.w });
        doc.text(row.validationStatus, cols[4]!.x, y, { width: cols[4]!.w });
        doc.text(row.codeSuffix, cols[5]!.x, y, { width: cols[5]!.w });
        y += 12;
      }
    }

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#444');
    doc.text('Listado de control interno — Yo Te Invito', { align: 'center' });
    doc.text('No reemplaza la validación QR del sistema.', { align: 'center' });
    doc.text('No incluye códigos QR completos.', { align: 'center' });

    doc.end();
    return finished;
  }

  async exportPdfForProducer(
    actor: ExportActor,
    eventId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const event = await this.assertProducerCanExport(
      actor.tenantId,
      eventId,
      actor.id,
      actor.role,
    );
    const rows = await this.fetchTicketRows(eventId);
    if (rows.length === 0) {
      throw new BadRequestException({
        code: 'NO_TICKETS',
        message: 'No hay entradas para exportar',
      });
    }
    const generatedAt = new Date();
    const buffer = await this.buildPdfBuffer(event, rows, generatedAt);
    await this.audit.logAction({
      tenantId: actor.tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.TICKET_LIST_EXPORTED,
      entityType: 'Event',
      entityId: eventId,
      metadata: { format: 'pdf', ticketCount: rows.length, source: 'producer' },
    });
    const safeTitle = event.title.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);
    return { buffer, filename: `entradas-${safeTitle}.pdf` };
  }

  async exportPdfForScanner(
    actor: ExportActor,
    eventId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const event = await this.assertScannerCanExport(actor.tenantId, actor.id, eventId);
    const rows = await this.fetchTicketRows(eventId);
    if (rows.length === 0) {
      throw new BadRequestException({
        code: 'NO_TICKETS',
        message: 'No hay entradas para exportar',
      });
    }
    const generatedAt = new Date();
    const buffer = await this.buildPdfBuffer(event, rows, generatedAt);
    await this.audit.logAction({
      tenantId: actor.tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.TICKET_LIST_EXPORTED,
      entityType: 'Event',
      entityId: eventId,
      metadata: { format: 'pdf', ticketCount: rows.length, source: 'scanner' },
    });
    const safeTitle = event.title.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);
    return { buffer, filename: `entradas-${safeTitle}.pdf` };
  }

  async buildOfflineSnapshot(
    tenantId: string,
    scannerUserId: string,
    eventId: string,
  ): Promise<OfflineSnapshotResponse> {
    const event = await this.assertScannerCanExport(tenantId, scannerUserId, eventId);
    const tickets = await this.prisma.ticket.findMany({
      where: { eventId },
      select: {
        id: true,
        status: true,
        qrPayload: true,
        ticketType: { select: { name: true } },
        order: {
          select: { buyerFirstName: true, buyerLastName: true, buyerEmail: true },
        },
        ownerUser: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    const generatedAt = new Date();
    const version = createHash('sha256')
      .update(`${eventId}:${generatedAt.toISOString()}:${tickets.length}`)
      .digest('hex')
      .slice(0, 16);

    const expiresAt = new Date(generatedAt.getTime() + 48 * 60 * 60 * 1000);

    return {
      snapshotId: `snap_${eventId}_${version}`,
      version,
      generatedAt: generatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      contentId: eventId,
      contentType: 'EVENT',
      eventTitle: event.title,
      eventStartAt: event.startAt?.toISOString() ?? null,
      tickets: tickets.map((t) => ({
        ticketId: t.id,
        status: t.status,
        buyerName: buyerDisplayName({ order: t.order, ownerUser: t.ownerUser }),
        ticketType: t.ticketType?.name ?? 'Entrada',
        code: shortTicketCode(t.id),
        qrPayload: t.qrPayload,
      })),
    };
  }

  async syncOfflineValidations(
    tenantId: string,
    scannerUserId: string,
    body: OfflineValidationSyncBody,
  ): Promise<OfflineValidationSyncResponse> {
    await this.scannerAccounts.assertScannerCanAccessEvent(
      tenantId,
      scannerUserId,
      body.contentId,
    );

    const results: OfflineValidationSyncItemResult[] = [];
    let synced = 0;
    let conflicts = 0;
    let errors = 0;

    for (const item of body.validations) {
      const result = await this.syncOneOfflineValidation(
        tenantId,
        scannerUserId,
        body.contentId,
        item,
      );
      results.push(result);
      if (result.code === 'synced') synced += 1;
      else if (
        result.code === 'already_used' ||
        result.code === 'conflict' ||
        result.code === 'revoked' ||
        result.code === 'transferred'
      ) {
        conflicts += 1;
      } else {
        errors += 1;
      }
    }

    return {
      results,
      summary: { synced, conflicts, errors },
    };
  }

  private async syncOneOfflineValidation(
    tenantId: string,
    scannerUserId: string,
    eventId: string,
    item: OfflineValidationSyncBody['validations'][number],
  ): Promise<OfflineValidationSyncItemResult> {
    const offlineMarker = `offline:${item.localId}`;
    const existingLog = await this.prisma.ticketScanLog.findFirst({
      where: {
        tenantId,
        eventId,
        deviceId: offlineMarker,
        scannerId: scannerUserId,
      },
    });
    if (existingLog?.result === 'OK') {
      return {
        localId: item.localId,
        code: 'synced',
        ticketId: existingLog.ticketId ?? undefined,
        message: 'Ya sincronizada',
      };
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: { qrPayload: item.qrPayload, eventId, event: { tenantId } },
      include: {
        ticketType: { select: { name: true } },
        order: {
          select: { buyerFirstName: true, buyerLastName: true, buyerEmail: true },
        },
        ownerUser: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!ticket) {
      await this.prisma.ticketScanLog.create({
        data: {
          tenantId,
          eventId,
          qrPayload: item.qrPayload,
          deviceId: offlineMarker,
          scannerId: scannerUserId,
          ticketId: null,
          result: 'INVALID',
        },
      });
      return {
        localId: item.localId,
        code: 'not_found',
        message: 'Entrada no encontrada',
      };
    }

    const buyerName = buyerDisplayName({ order: ticket.order, ownerUser: ticket.ownerUser });
    const ticketType = ticket.ticketType?.name ?? 'Entrada';

    if (ticket.status === 'REVOKED') {
      await this.prisma.ticketScanLog.create({
        data: {
          tenantId,
          eventId,
          qrPayload: item.qrPayload,
          deviceId: offlineMarker,
          scannerId: scannerUserId,
          ticketId: ticket.id,
          result: 'REVOKED',
        },
      });
      return {
        localId: item.localId,
        code: 'revoked',
        ticketId: ticket.id,
        buyerName,
        ticketType,
        message: 'Entrada revocada',
      };
    }

    if (ticket.status === 'TRANSFER_PENDING' || ticket.status === 'TRANSFERRED') {
      await this.prisma.ticketScanLog.create({
        data: {
          tenantId,
          eventId,
          qrPayload: item.qrPayload,
          deviceId: offlineMarker,
          scannerId: scannerUserId,
          ticketId: ticket.id,
          result: 'INVALID',
        },
      });
      return {
        localId: item.localId,
        code: 'transferred',
        ticketId: ticket.id,
        buyerName,
        ticketType,
        message: 'Entrada en transferencia',
      };
    }

    if (ticket.status === 'USED') {
      const scannedAt = new Date(item.scannedAt);
      const usedBeforeOffline =
        ticket.usedAt && ticket.usedAt.getTime() < scannedAt.getTime() - 60_000;
      await this.prisma.ticketScanLog.create({
        data: {
          tenantId,
          eventId,
          qrPayload: item.qrPayload,
          deviceId: offlineMarker,
          scannerId: scannerUserId,
          ticketId: ticket.id,
          result: 'ALREADY_USED',
        },
      });
      return {
        localId: item.localId,
        code: usedBeforeOffline ? 'conflict' : 'already_used',
        ticketId: ticket.id,
        buyerName,
        ticketType,
        message: usedBeforeOffline
          ? 'Ya figuraba usada online antes del escaneo offline'
          : 'Entrada ya utilizada',
      };
    }

    if (ticket.status !== 'VALID') {
      return {
        localId: item.localId,
        code: 'rejected',
        ticketId: ticket.id,
        buyerName,
        ticketType,
        message: `Estado no válido: ${ticket.status}`,
      };
    }

    const now = new Date();
    const { count } = await this.prisma.ticket.updateMany({
      where: { id: ticket.id, status: 'VALID' },
      data: { status: 'USED', usedAt: now },
    });

    if (count === 0) {
      await this.prisma.ticketScanLog.create({
        data: {
          tenantId,
          eventId,
          qrPayload: item.qrPayload,
          deviceId: offlineMarker,
          scannerId: scannerUserId,
          ticketId: ticket.id,
          result: 'ALREADY_USED',
        },
      });
      return {
        localId: item.localId,
        code: 'already_used',
        ticketId: ticket.id,
        buyerName,
        ticketType,
        message: 'Entrada ya utilizada',
      };
    }

    await this.prisma.ticketScanLog.create({
      data: {
        tenantId,
        eventId,
        qrPayload: item.qrPayload,
        deviceId: offlineMarker,
        scannerId: scannerUserId,
        ticketId: ticket.id,
        result: 'OK',
      },
    });

    return {
      localId: item.localId,
      code: 'synced',
      ticketId: ticket.id,
      buyerName,
      ticketType,
      message: 'Sincronizada',
    };
  }
}
