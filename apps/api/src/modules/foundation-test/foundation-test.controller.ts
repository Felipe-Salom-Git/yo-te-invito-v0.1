import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { testValidationBodySchema } from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';

@Controller('test')
export class FoundationTestController {
  @Post('validation')
  @UsePipes(new ZodValidationPipe(testValidationBodySchema))
  validation(@Body() body: { name: string }) {
    return { ok: true, name: body.name };
  }

  @Get('auth')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.ADMIN)
  auth(@CurrentUser() user: { id: string; tenantId: string; role: string }) {
    return { userId: user.id, tenantId: user.tenantId, role: user.role };
  }
}
