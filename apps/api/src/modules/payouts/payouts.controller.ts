import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { Role } from '@yo-te-invito/shared';
import { PayoutsService } from './payouts.service';

@Controller('admin')
export class AdminPayoutsController {
  constructor(private readonly service: PayoutsService) {}

  @Get('payouts')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async listAll(@CurrentUser() user: { tenantId: string }) {
    return this.service.listAll(user.tenantId);
  }

  @Patch('payouts/:id')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  async updateStatus(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const result = await this.service.updateStatus(id, status, user.tenantId);
    if (!result) throw new NotFoundException('Payout not found');
    return result;
  }
}

@Controller('producer')
export class ProducerPayoutsController {
  constructor(
    private readonly service: PayoutsService,
    private readonly profilesAuth: ProfilesAuthorizationService,
  ) {}

  @Get('payouts')
  @UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async listByProducer(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.service.listByProducer(user.id, user.tenantId);
  }

  @Get('events/:eventId/payouts')
  @UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async listByEvent(
    @CurrentUser() user: { tenantId: string },
    @Param('eventId') eventId: string,
  ) {
    return this.service.listByEvent(eventId, user.tenantId);
  }

  @Post('payouts')
  @UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() body: {
      eventId: string;
      producerId?: string;
      amountCents: number;
      bankInfo?: { titular?: string; banco?: string; cbu?: string };
    },
  ) {
    const producerProfileId = await this.profilesAuth.getDefaultProducerProfileId(user.tenantId, user.id);
    return this.service.create(
      user.tenantId,
      body.eventId,
      body.producerId ?? user.id,
      body.amountCents,
      user.id,
      body.bankInfo,
      producerProfileId,
    );
  }
}
