import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
  ) {
    return this.authService.register(body);
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
