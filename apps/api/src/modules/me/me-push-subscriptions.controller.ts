import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import {
  deactivatePushSubscriptionSchema,
  registerPushSubscriptionSchema,
  sendTestPushSchema,
} from '@yo-te-invito/shared';
import type {
  DeactivatePushSubscriptionBody,
  RegisterPushSubscriptionBody,
  SendTestPushBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPushSubscriptionsService } from './user-push-subscriptions.service';

@Controller('me/push-subscriptions')
@UseGuards(JwtOrDevAuthGuard)
export class MePushSubscriptionsController {
  constructor(private readonly pushSubs: UserPushSubscriptionsService) {}

  @Get('config')
  config() {
    return this.pushSubs.getConfig();
  }

  @Get()
  list(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.pushSubs.list(user.tenantId, user.id);
  }

  @Post()
  register(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(registerPushSubscriptionSchema))
    body: RegisterPushSubscriptionBody,
  ) {
    return this.pushSubs.register(user.tenantId, user.id, body);
  }

  @Delete('current')
  deactivateCurrent(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(deactivatePushSubscriptionSchema))
    body: DeactivatePushSubscriptionBody,
  ) {
    return this.pushSubs.deactivateCurrent(user.tenantId, user.id, body);
  }

  @Post('test')
  sendTest(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body(new ZodValidationPipe(sendTestPushSchema)) body: SendTestPushBody,
  ) {
    return this.pushSubs.sendTest(user.tenantId, user.id, body);
  }
}
