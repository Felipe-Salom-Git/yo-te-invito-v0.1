import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  validateTicketQuerySchema,
  validateTicketBodySchema,
  validateGastroDiscountBodySchema,
  scanBodySchema,
  eventTicketsParamsSchema,
  scannerLogsQuerySchema,
  type ValidateTicketQuery,
  type ValidateTicketBody,
  type ValidateGastroDiscountBody,
  type ScanBody,
  type EventTicketsParams,
  type ScannerLogsQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ScannerService } from './scanner.service';
import { ScannerGastroDiscountService } from './scanner-gastro-discount.service';

@Controller('scanner')
export class ScannerController {
  constructor(
    private readonly service: ScannerService,
    private readonly gastroDiscountScanner: ScannerGastroDiscountService,
  ) {}

  @Post('validate')
  async validate(
    @Req() req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } },
    @Query(new ZodValidationPipe(validateTicketQuerySchema))
    query: ValidateTicketQuery,
    @Body(new ZodValidationPipe(validateTicketBodySchema)) body: ValidateTicketBody,
  ) {
    const raw = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(raw) ? raw[0] : raw;
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : null) ??
      req.socket?.remoteAddress ??
      null;
    const userAgent = (req.headers['user-agent'] as string) ?? null;
    return this.service.validate(query, body, { ipAddress: ip ?? undefined, userAgent: userAgent ?? undefined });
  }

  @Get('events/:eventId/logs')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.SCANNER, Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF)
  async listScanLogs(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(eventTicketsParamsSchema)) params: EventTicketsParams,
    @Query(new ZodValidationPipe(scannerLogsQuerySchema)) query: ScannerLogsQuery,
  ) {
    return this.service.listScanLogs(user.tenantId, params.eventId, query.limit);
  }

  @Get('events/:eventId/tickets')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.SCANNER)
  async getEventTickets(
    @CurrentUser() user: { tenantId: string },
    @Param(new ZodValidationPipe(eventTicketsParamsSchema)) params: EventTicketsParams,
  ) {
    return this.service.getEventTickets(user.tenantId, params.eventId);
  }

  @Post('scan')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.SCANNER)
  async scan(
    @CurrentUser() user: { tenantId: string; id: string },
    @Body(new ZodValidationPipe(scanBodySchema)) body: ScanBody,
  ) {
    return this.service.scan(user.tenantId, user.id, body);
  }

  @Post('gastro-discounts/validate')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.SCANNER, Role.ADMIN, Role.GASTRO_OWNER)
  async validateGastroDiscount(
    @CurrentUser() user: { tenantId: string; id: string; role: string },
    @Body(new ZodValidationPipe(validateGastroDiscountBodySchema))
    body: ValidateGastroDiscountBody,
  ) {
    return this.gastroDiscountScanner.validate(
      user.tenantId,
      user.id,
      user.role,
      body,
    );
  }
}
