import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@yo-te-invito/shared';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EventPublicationLegalService } from '../legal/event-publication-legal.service';

@Controller('producer/events/:eventId/legal')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
@RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
export class ProducerEventLegalController {
  constructor(private readonly eventPublicationLegal: EventPublicationLegalService) {}

  @Get('publication-terms')
  getPublicationTermsStatus(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
  ) {
    return this.eventPublicationLegal.getPublicationTermsStatus(
      user.tenantId,
      eventId,
      user.id,
      user.role,
    );
  }

  @Post('accept-publication-terms')
  acceptPublicationTerms(
    @CurrentUser() user: { id: string; tenantId: string; role: string },
    @Param('eventId') eventId: string,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string },
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      req.ip ??
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ??
      null;
    const userAgent = (req.headers['user-agent'] as string) ?? null;

    return this.eventPublicationLegal.acceptPublicationTerms(
      user.tenantId,
      eventId,
      user.id,
      user.role,
      { ipAddress: ip, userAgent },
    );
  }
}
