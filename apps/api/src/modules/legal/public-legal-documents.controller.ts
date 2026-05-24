import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  publicLegalDocumentParamsSchema,
  publicLegalDocumentQuerySchema,
  publicLegalRequirementsQuerySchema,
  type PublicLegalDocumentParams,
  type PublicLegalDocumentQuery,
  type PublicLegalRequirementsQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LegalDocumentsService } from './legal-documents.service';

@Controller('public/legal')
export class PublicLegalDocumentsController {
  constructor(private readonly legalDocuments: LegalDocumentsService) {}

  @Get('requirements')
  getRequirements(
    @Query(new ZodValidationPipe(publicLegalRequirementsQuerySchema))
    query: PublicLegalRequirementsQuery,
  ) {
    return this.legalDocuments.getPublicRequirements(query.tenantId, query);
  }

  @Get(':slug')
  getBySlug(
    @Param(new ZodValidationPipe(publicLegalDocumentParamsSchema))
    params: PublicLegalDocumentParams,
    @Query(new ZodValidationPipe(publicLegalDocumentQuerySchema))
    query: PublicLegalDocumentQuery,
  ) {
    return this.legalDocuments.getPublicBySlug(query.tenantId, params.slug);
  }
}
