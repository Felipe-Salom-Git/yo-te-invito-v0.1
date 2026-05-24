import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  adminLegalDocumentKeyParamsSchema,
  adminLegalDocumentListQuerySchema,
  adminPublishLegalDocumentSchema,
  adminSaveLegalDocumentDraftSchema,
  adminUpdateLegalDocumentSchema,
  Role,
  type AdminLegalDocumentKeyParams,
  type AdminLegalDocumentListQuery,
  type AdminPublishLegalDocument,
  type AdminSaveLegalDocumentDraft,
  type AdminUpdateLegalDocument,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LegalDocumentsService } from './legal-documents.service';

@Controller('admin/legal-documents')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminLegalDocumentsController {
  constructor(private readonly legalDocuments: LegalDocumentsService) {}

  @Get()
  list(
    @CurrentUser() user: { tenantId: string },
    @Query(new ZodValidationPipe(adminLegalDocumentListQuerySchema))
    query: AdminLegalDocumentListQuery,
  ) {
    return this.legalDocuments.listAdmin(user.tenantId, query);
  }

  @Get(':key/versions')
  listVersions(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(adminLegalDocumentKeyParamsSchema))
    params: AdminLegalDocumentKeyParams,
  ) {
    return this.legalDocuments.listAdminVersions(user.tenantId, params.key);
  }

  @Patch(':key')
  updateMetadata(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminLegalDocumentKeyParamsSchema))
    params: AdminLegalDocumentKeyParams,
    @Body(new ZodValidationPipe(adminUpdateLegalDocumentSchema)) body: AdminUpdateLegalDocument,
  ) {
    return this.legalDocuments.updateDocumentMetadata(
      user.tenantId,
      params.key,
      body,
      { id: user.id, role: user.role },
    );
  }

  @Post(':key/draft')
  saveDraft(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminLegalDocumentKeyParamsSchema))
    params: AdminLegalDocumentKeyParams,
    @Body(new ZodValidationPipe(adminSaveLegalDocumentDraftSchema))
    body: AdminSaveLegalDocumentDraft,
  ) {
    return this.legalDocuments.saveDraft(user.tenantId, params.key, body, {
      id: user.id,
      role: user.role,
    });
  }

  @Post(':key/publish')
  publish(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param(new ZodValidationPipe(adminLegalDocumentKeyParamsSchema))
    params: AdminLegalDocumentKeyParams,
    @Body(new ZodValidationPipe(adminPublishLegalDocumentSchema)) body: AdminPublishLegalDocument,
  ) {
    return this.legalDocuments.publishDraft(user.tenantId, params.key, body, {
      id: user.id,
      role: user.role,
    });
  }

  @Get(':key')
  getByKey(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(adminLegalDocumentKeyParamsSchema))
    params: AdminLegalDocumentKeyParams,
  ) {
    return this.legalDocuments.getAdminDetail(user.tenantId, params.key);
  }
}
