import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import {
  compileDiscountVisualTemplateDesign,
  DISCOUNT_VISUAL_DEFAULT_QR_ZONE,
  ErrorCode,
  mapDiscountVisualTemplateRow,
  type GastroDiscountVisualTemplateResponse,
  type UpsertGastroDiscountVisualTemplateDto,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GastroOwnershipService } from './gastro-ownership.service';

@Injectable()
export class GastroDiscountVisualTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: GastroOwnershipService,
    private readonly audit: AuditService,
  ) {}

  private toApiRow(row: {
    id: string;
    tenantId: string;
    gastroDiscountId: string;
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
  }): GastroDiscountVisualTemplateResponse | null {
    return mapDiscountVisualTemplateRow(row);
  }

  private async assertDiscountAccess(
    tenantId: string,
    userId: string,
    userRole: string,
    discountId: string,
    adminProfileId?: string,
  ) {
    const row = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId },
    });
    if (!row) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Discount not found' });
    }
    if (!row.gastroProfileId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'No tenés permiso para gestionar este descuento',
      });
    }
    if (adminProfileId && row.gastroProfileId !== adminProfileId) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Discount not found' });
    }
    if (userRole === 'ADMIN') {
      return { row, profileId: row.gastroProfileId };
    }
    await this.ownership.assertCanOperateProfile(tenantId, userId, row.gastroProfileId);
    return { row, profileId: row.gastroProfileId };
  }

  async get(
    tenantId: string,
    userId: string,
    userRole: string,
    discountId: string,
    adminProfileId?: string,
  ): Promise<{ template: GastroDiscountVisualTemplateResponse | null }> {
    await this.assertDiscountAccess(tenantId, userId, userRole, discountId, adminProfileId);
    const tpl = await this.prisma.gastroDiscountTemplate.findFirst({
      where: { gastroDiscountId: discountId, tenantId },
    });
    if (!tpl) return { template: null };
    return { template: this.toApiRow(tpl) };
  }

  async upsert(
    tenantId: string,
    userId: string,
    userRole: string,
    discountId: string,
    dto: UpsertGastroDiscountVisualTemplateDto,
    adminProfileId?: string,
  ): Promise<{ template: GastroDiscountVisualTemplateResponse }> {
    await this.assertDiscountAccess(tenantId, userId, userRole, discountId, adminProfileId);

    const existing = await this.prisma.gastroDiscountTemplate.findFirst({
      where: { gastroDiscountId: discountId, tenantId },
    });
    const existingMapped = existing ? this.toApiRow(existing) : null;

    let compiled;
    try {
      compiled = compileDiscountVisualTemplateDesign(
        dto,
        existingMapped
          ? {
              name: existingMapped.name,
              canvasWidth: existingMapped.canvasWidth,
              canvasHeight: existingMapped.canvasHeight,
              backgroundType: existingMapped.backgroundType,
              backgroundValue: existingMapped.backgroundValue,
              elementsJson: existingMapped.elementsJson,
              qrZoneJson: existingMapped.qrZoneJson,
            }
          : existing
            ? {
                name: existing.name,
                canvasWidth: existing.canvasWidth,
                canvasHeight: existing.canvasHeight,
                backgroundType: existing.backgroundType,
                backgroundValue: existing.backgroundValue,
                elementsJson: [],
                qrZoneJson: DISCOUNT_VISUAL_DEFAULT_QR_ZONE,
              }
            : null,
      );
    } catch (e) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: e instanceof Error ? e.message : 'Plantilla visual inválida',
      });
    }

    if (existing) {
      const updated = await this.prisma.gastroDiscountTemplate.update({
        where: { id: existing.id },
        data: {
          name: compiled.name,
          canvasWidth: compiled.canvasWidth,
          canvasHeight: compiled.canvasHeight,
          backgroundType: compiled.backgroundType,
          backgroundValue: compiled.backgroundValue,
          elementsJson: compiled.elementsJson as Prisma.InputJsonValue,
          qrZoneJson: compiled.qrZoneJson as Prisma.InputJsonValue,
          version: { increment: 1 },
          updatedByUserId: userId,
        },
      });
      await this.audit.logAction({
        tenantId,
        actorId: userId,
        actorRole: userRole,
        action: AuditAction.GASTRO_DISCOUNT_TEMPLATE_UPDATED,
        entityType: 'GastroDiscountTemplate',
        entityId: updated.id,
        metadata: { gastroDiscountId: discountId },
      });
      const mapped = this.toApiRow(updated);
      if (!mapped) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Plantilla visual inválida',
        });
      }
      return { template: mapped };
    }

    const created = await this.prisma.gastroDiscountTemplate.create({
      data: {
        tenantId,
        gastroDiscountId: discountId,
        name: compiled.name,
        canvasWidth: compiled.canvasWidth,
        canvasHeight: compiled.canvasHeight,
        backgroundType: compiled.backgroundType,
        backgroundValue: compiled.backgroundValue,
        elementsJson: compiled.elementsJson as Prisma.InputJsonValue,
        qrZoneJson: compiled.qrZoneJson as Prisma.InputJsonValue,
        version: 1,
        createdByUserId: userId,
        updatedByUserId: userId,
      },
    });
    await this.audit.logAction({
      tenantId,
      actorId: userId,
      actorRole: userRole,
      action: AuditAction.GASTRO_DISCOUNT_TEMPLATE_CREATED,
      entityType: 'GastroDiscountTemplate',
      entityId: created.id,
      metadata: { gastroDiscountId: discountId },
    });
    const mappedCreated = this.toApiRow(created);
    if (!mappedCreated) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Plantilla visual inválida',
      });
    }
    return { template: mappedCreated };
  }

  async reset(
    tenantId: string,
    userId: string,
    userRole: string,
    discountId: string,
    adminProfileId?: string,
  ): Promise<{ ok: true }> {
    await this.assertDiscountAccess(tenantId, userId, userRole, discountId, adminProfileId);
    const existing = await this.prisma.gastroDiscountTemplate.findFirst({
      where: { gastroDiscountId: discountId, tenantId },
    });
    if (!existing) return { ok: true };
    await this.prisma.gastroDiscountTemplate.delete({ where: { id: existing.id } });
    await this.audit.logAction({
      tenantId,
      actorId: userId,
      actorRole: userRole,
      action: AuditAction.GASTRO_DISCOUNT_TEMPLATE_RESET,
      entityType: 'GastroDiscountTemplate',
      entityId: existing.id,
      metadata: { gastroDiscountId: discountId },
    });
    return { ok: true };
  }

  /** Public/me renderer: tenant-scoped read, no ownership of gastro portal. */
  async getPublishedForDiscount(
    tenantId: string,
    discountId: string,
  ): Promise<GastroDiscountVisualTemplateResponse | null> {
    const tpl = await this.prisma.gastroDiscountTemplate.findFirst({
      where: { gastroDiscountId: discountId, tenantId },
    });
    if (!tpl) return null;
    return this.toApiRow(tpl);
  }
}
