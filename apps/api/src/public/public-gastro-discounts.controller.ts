import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  publicGastroDiscountClaimBodySchema,
  publicGastroDiscountClaimViewQuerySchema,
  publicGastroDiscountListQuerySchema,
  type PublicGastroDiscountClaimBody,
  type PublicGastroDiscountClaimViewQuery,
  type PublicGastroDiscountListQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OptionalJwtOrDevAuthGuard } from '../auth/optional-jwt-or-dev-auth.guard';
import { PublicGastroDiscountsService } from './public-gastro-discounts.service';

@Controller('public/gastro-discounts')
export class PublicGastroDiscountsController {
  constructor(private readonly discounts: PublicGastroDiscountsService) {}

  @Get('count')
  async count(
    @Query(new ZodValidationPipe(publicGastroDiscountListQuerySchema.pick({ tenantId: true })))
    query: { tenantId: string },
  ) {
    const count = await this.discounts.countPublished(query.tenantId);
    return { count };
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(publicGastroDiscountListQuerySchema))
    query: PublicGastroDiscountListQuery,
  ) {
    return this.discounts.list(query.tenantId, {
      subcategorySlug: query.subcategorySlug,
      limit: query.limit,
    });
  }

  @Get('claims/:claimId')
  async getClaim(
    @Param('claimId') claimId: string,
    @Query(new ZodValidationPipe(publicGastroDiscountClaimViewQuerySchema))
    query: PublicGastroDiscountClaimViewQuery,
  ) {
    return this.discounts.getClaimView(query.tenantId, claimId, query.accessToken);
  }

  @Get(':discountId')
  async getOne(
    @Param('discountId') discountId: string,
    @Query(new ZodValidationPipe(publicGastroDiscountListQuerySchema.pick({ tenantId: true })))
    query: { tenantId: string },
  ) {
    return this.discounts.getById(query.tenantId, discountId);
  }

  @Post(':discountId/claim')
  @UseGuards(OptionalJwtOrDevAuthGuard)
  async claim(
    @Param('discountId') discountId: string,
    @Body(new ZodValidationPipe(publicGastroDiscountClaimBodySchema))
    body: PublicGastroDiscountClaimBody,
    @Req() req: { user?: { id: string; role: string } },
  ) {
    const user = req.user;
    return this.discounts.claim(
      body.tenantId,
      discountId,
      body.email,
      user?.id ?? null,
      process.env.WEB_BASE_URL,
      user?.role ?? 'GUEST',
      user?.id,
    );
  }
}
