import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpsertTicketTemplateDto, TicketTemplateResponse } from '@yo-te-invito/shared';
import {
  ticketTemplateElementSchema,
  ticketTemplateQrZoneSchema,
  TICKET_TEMPLATE_DEFAULT_QR_ZONE,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

const SAFE_MARGIN = 0.04;
const MIN_QR_W = 0.18;
const MIN_QR_H = 0.18;

const DEFAULT_QR_ZONE = { ...TICKET_TEMPLATE_DEFAULT_QR_ZONE };

function assertQrZoneSafe(qr: { x: number; y: number; w: number; h: number }) {
  const parsed = ticketTemplateQrZoneSchema.safeParse(qr);
  if (!parsed.success) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Zona QR inválida',
      details: parsed.error.flatten(),
    });
  }
  const { x, y, w, h } = parsed.data;
  if (w < MIN_QR_W || h < MIN_QR_H) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: `La zona QR debe medir al menos ${MIN_QR_W}×${MIN_QR_H} (relativo al canvas).`,
    });
  }
  if (x < SAFE_MARGIN || y < SAFE_MARGIN) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'La zona QR debe quedar dentro del margen seguro (no pegada al borde).',
    });
  }
  if (x + w > 1 - SAFE_MARGIN || y + h > 1 - SAFE_MARGIN) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'La zona QR no puede salir del área segura del ticket.',
    });
  }
}

function normRect(r: { x: number; y: number; w: number; h: number }) {
  return r;
}

function intersects(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function parseElements(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  const out: unknown[] = [];
  for (const item of raw) {
    const p = ticketTemplateElementSchema.safeParse(item);
    if (!p.success) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'elementsJson contiene un elemento inválido',
        details: p.error.flatten(),
      });
    }
    if ((p.data as { type: string }).type === 'QR') {
      continue;
    }
    out.push(p.data);
  }
  return out;
}

function assertElementsDoNotCoverQr(
  elements: Array<{ x: number; y: number; w: number; h: number }>,
  qr: { x: number; y: number; w: number; h: number },
) {
  const q = normRect(qr);
  for (const el of elements) {
    if (intersects(normRect(el), q)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message:
          'Hay elementos superpuestos con la zona QR. Mové o achicá capas para dejar el código visible.',
      });
    }
  }
}

@Injectable()
export class ProducerTicketTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertTicketType(
    tenantId: string,
    eventId: string,
    ticketTypeId: string,
    userId: string,
    userRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true, producerId: true, tenantId: true },
    });
    if (!event) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }
    const isAdmin = userRole === 'ADMIN';
    const isOwner = event.producerId === userId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });
    }
    const tt = await this.prisma.ticketType.findFirst({
      where: { id: ticketTypeId, eventId, tenantId, deletedAt: null },
      select: { id: true, tenantId: true, ticketTemplateId: true },
    });
    if (!tt) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Ticket type not found' });
    }
    return tt;
  }

  private toApiRow(
    row: {
      id: string;
      tenantId: string;
      name: string;
      canvasWidth: number;
      canvasHeight: number;
      backgroundType: string;
      backgroundValue: string;
      elementsJson: unknown;
      qrZoneJson: unknown;
      version: number;
      createdAt: Date;
      updatedAt: Date;
    },
    ticketTypeId: string,
  ): TicketTemplateResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      ticketTypeId,
      name: row.name,
      canvasWidth: row.canvasWidth,
      canvasHeight: row.canvasHeight,
      backgroundType: row.backgroundType,
      backgroundValue: row.backgroundValue,
      elementsJson: Array.isArray(row.elementsJson) ? row.elementsJson : [],
      qrZoneJson: row.qrZoneJson,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getForType(
    tenantId: string,
    eventId: string,
    ticketTypeId: string,
    userId: string,
    userRole: string,
  ): Promise<{ template: TicketTemplateResponse | null }> {
    await this.assertTicketType(tenantId, eventId, ticketTypeId, userId, userRole);
    const tt = await this.prisma.ticketType.findFirst({
      where: { id: ticketTypeId, eventId, tenantId, deletedAt: null },
      include: { ticketTemplate: true },
    });
    if (!tt?.ticketTemplate) {
      return { template: null };
    }
    return { template: this.toApiRow(tt.ticketTemplate, tt.id) };
  }

  async upsertForType(
    tenantId: string,
    eventId: string,
    ticketTypeId: string,
    userId: string,
    userRole: string,
    dto: UpsertTicketTemplateDto,
  ): Promise<{ template: TicketTemplateResponse }> {
    const tt = await this.assertTicketType(tenantId, eventId, ticketTypeId, userId, userRole);

    const existing = tt.ticketTemplateId
      ? await this.prisma.ticketTemplate.findFirst({
          where: { id: tt.ticketTemplateId, tenantId },
        })
      : null;

    const qrZoneJson = dto.qrZoneJson ?? (existing?.qrZoneJson as object) ?? DEFAULT_QR_ZONE;
    assertQrZoneSafe(qrZoneJson as { x: number; y: number; w: number; h: number });

    const elementsRaw = dto.elementsJson ?? (existing?.elementsJson as unknown[]) ?? [];
    const elementsParsed = parseElements(elementsRaw);
    assertElementsDoNotCoverQr(
      elementsParsed as Array<{ x: number; y: number; w: number; h: number }>,
      qrZoneJson as { x: number; y: number; w: number; h: number },
    );

    const name = dto.name ?? existing?.name ?? 'Diseño personalizado';
    const canvasWidth = dto.canvasWidth ?? existing?.canvasWidth ?? 320;
    const canvasHeight = dto.canvasHeight ?? existing?.canvasHeight ?? 560;
    const backgroundType = dto.backgroundType ?? existing?.backgroundType ?? 'SOLID';
    const backgroundValue = dto.backgroundValue ?? existing?.backgroundValue ?? '#0a0a0a';

    if (existing) {
      const updated = await this.prisma.ticketTemplate.update({
        where: { id: existing.id },
        data: {
          name,
          canvasWidth,
          canvasHeight,
          backgroundType,
          backgroundValue,
          elementsJson: elementsParsed as Prisma.InputJsonValue,
          qrZoneJson: qrZoneJson as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
      return { template: this.toApiRow(updated, ticketTypeId) };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const tpl = await tx.ticketTemplate.create({
        data: {
          tenantId,
          name,
          canvasWidth,
          canvasHeight,
          backgroundType,
          backgroundValue,
          elementsJson: elementsParsed as Prisma.InputJsonValue,
          qrZoneJson: qrZoneJson as Prisma.InputJsonValue,
          version: 1,
        },
      });
      await tx.ticketType.update({
        where: { id: ticketTypeId },
        data: { ticketTemplateId: tpl.id },
      });
      return tpl;
    });

    return { template: this.toApiRow(created, ticketTypeId) };
  }

  async deleteForType(
    tenantId: string,
    eventId: string,
    ticketTypeId: string,
    userId: string,
    userRole: string,
  ): Promise<{ ok: true }> {
    const tt = await this.assertTicketType(tenantId, eventId, ticketTypeId, userId, userRole);
    if (!tt.ticketTemplateId) {
      return { ok: true };
    }
    const tplId = tt.ticketTemplateId;
    await this.prisma.$transaction([
      this.prisma.ticketType.update({
        where: { id: ticketTypeId },
        data: { ticketTemplateId: null },
      }),
      this.prisma.ticketTemplate.deleteMany({ where: { id: tplId, tenantId } }),
    ]);
    return { ok: true };
  }
}
