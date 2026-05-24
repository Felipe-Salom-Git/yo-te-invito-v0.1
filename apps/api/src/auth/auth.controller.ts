import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import {
  authLoginRequestSchema,
  authRegisterRequestSchema,
  authApplyRoleRequestSchema,
  authGoogleRequestSchema,
  type AuthLoginRequest,
  type AuthRegisterRequest,
  type AuthApplyRoleRequest,
  type AuthGoogleRequest,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(authLoginRequestSchema)) body: AuthLoginRequest,
  ) {
    return this.authService.login(body);
  }

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(authRegisterRequestSchema)) body: AuthRegisterRequest,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string },
  ) {
    return this.authService.register(body, {
      ipAddress: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string) ?? null,
    });
  }

  @Post('apply-role')
  async applyRole(
    @Body(new ZodValidationPipe(authApplyRoleRequestSchema)) body: AuthApplyRoleRequest,
  ) {
    return this.authService.applyRole(body);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token ?? '');
  }

  @Post('google')
  async google(
    @Body(new ZodValidationPipe(authGoogleRequestSchema)) body: AuthGoogleRequest,
  ) {
    return this.authService.findOrCreateFromGoogle(body);
  }
}
