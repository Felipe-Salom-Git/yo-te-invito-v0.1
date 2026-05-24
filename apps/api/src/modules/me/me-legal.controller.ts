import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  meLegalAcceptRequestSchema,
  meLegalRequirementsQuerySchema,
  type MeLegalAcceptRequest,
  type MeLegalRequirementsQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MeLegalService } from '../legal/me-legal.service';

@Controller('me/legal')
@UseGuards(JwtOrDevAuthGuard)
export class MeLegalController {
  constructor(private readonly meLegal: MeLegalService) {}

  @Get('requirements')
  getRequirements(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query(new ZodValidationPipe(meLegalRequirementsQuerySchema))
    query: MeLegalRequirementsQuery,
  ) {
    return this.meLegal.getRequirements(user.tenantId, user.id, query);
  }

  @Post('accept')
  accept(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(meLegalAcceptRequestSchema)) body: MeLegalAcceptRequest,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string },
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      req.ip ??
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ??
      null;
    const userAgent = (req.headers['user-agent'] as string) ?? null;

    return this.meLegal.acceptDocuments(user.tenantId, user.id, body, {
      ipAddress: ip,
      userAgent,
    });
  }

  @Get('acceptances')
  listAcceptances(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.meLegal.listAcceptances(user.tenantId, user.id);
  }
}
