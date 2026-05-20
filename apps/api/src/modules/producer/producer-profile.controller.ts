import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ProducerProfileService } from './producer-profile.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createProducerProfileSchema,
  updateProducerProfileSchema,
  type CreateProducerProfileInput,
  type UpdateProducerProfileInput,
} from '@yo-te-invito/shared';

@Controller('producer/profile')
@UseGuards(JwtOrDevAuthGuard, ProducerRolesGuard)
export class ProducerProfileController {
  constructor(private readonly profileService: ProducerProfileService) {}

  @Get()
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async getMyProfile(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.profileService.getMyProfile(user.tenantId, user.id);
  }

  @Post()
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async createMyProfile(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(createProducerProfileSchema)) body: CreateProducerProfileInput,
  ) {
    return this.profileService.createMyProfile(user.tenantId, user.id, body);
  }

  @Patch()
  @RequireRole(Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async updateMyProfile(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(updateProducerProfileSchema)) body: UpdateProducerProfileInput,
  ) {
    return this.profileService.updateMyProfile(user.tenantId, user.id, body);
  }
}
