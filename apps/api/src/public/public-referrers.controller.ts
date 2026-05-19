import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  publicReferrersListQuerySchema,
  publicReferrerBySlugQuerySchema,
  publicReferrerAssociationResolveQuerySchema,
  type PublicReferrersListQuery,
  type PublicReferrerBySlugQuery,
  type PublicReferrerAssociationResolveQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ReferrerProfilesService } from '../modules/referrer/referrer-profiles.service';

@Controller('public/referrers')
export class PublicReferrersController {
  constructor(private readonly referrers: ReferrerProfilesService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(publicReferrersListQuerySchema)) query: PublicReferrersListQuery,
  ) {
    return this.referrers.listPublicReferrers(query.tenantId, query.page, query.limit);
  }

  @Get('slug/:slug')
  async bySlug(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(publicReferrerBySlugQuerySchema)) query: PublicReferrerBySlugQuery,
  ) {
    return this.referrers.getPublicBySlug(query.tenantId, slug);
  }

  @Get('association/:token')
  async resolveAssociation(
    @Param('token') token: string,
    @Query(
      new ZodValidationPipe(publicReferrerAssociationResolveQuerySchema),
    ) query: PublicReferrerAssociationResolveQuery,
  ) {
    return this.referrers.resolveAssociationTarget(query.tenantId, token);
  }
}
