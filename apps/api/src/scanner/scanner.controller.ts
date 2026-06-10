import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
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
  offlineValidationSyncBodySchema,
  type OfflineValidationSyncBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtOrDevAuthGuard } from '../auth/jwt-or-dev-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@yo-te-invito/shared';
import { ScannerService } from './scanner.service';
import { ScannerGastroDiscountService } from './scanner-gastro-discount.service';
import { ScannerAccountsService } from '../modules/scanner-accounts/scanner-accounts.service';
import { TicketListExportService } from '../modules/tickets/ticket-list-export.service';

@Controller('scanner')
export class ScannerController {
  constructor(
    private readonly service: ScannerService,
    private readonly gastroDiscountScanner: ScannerGastroDiscountService,
    private readonly scannerAccounts: ScannerAccountsService,
    private readonly ticketListExport: TicketListExportService,
  ) {}

  @Get('scan-targets')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.SCANNER)
  getScanTargets(@CurrentUser() user: { id: string; tenantId: string; role: string }) {
    return this.scannerAccounts.getScanTargetsForScanner(user);
  }

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
    @CurrentUser() user: { tenantId: string; id: string },
    @Param(new ZodValidationPipe(eventTicketsParamsSchema)) params: EventTicketsParams,
  ) {
    return this.service.getEventTickets(user.tenantId, user.id, params.eventId);
  }

  @Get('events/:eventId/tickets/export.pdf')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.SCANNER)
  async exportTicketsPdf(
    @CurrentUser() user: { tenantId: string; id: string; role: string },
    @Param(new ZodValidationPipe(eventTicketsParamsSchema)) params: EventTicketsParams,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.ticketListExport.exportPdfForScanner(
      user,
      params.eventId,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get('events/:eventId/snapshot')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.SCANNER)
  async getEventSnapshot(
    @CurrentUser() user: { tenantId: string; id: string },
    @Param(new ZodValidationPipe(eventTicketsParamsSchema)) params: EventTicketsParams,
  ) {
    return this.ticketListExport.buildOfflineSnapshot(
      user.tenantId,
      user.id,
      params.eventId,
    );
  }

  @Post('offline-validations/sync')
  @UseGuards(JwtOrDevAuthGuard, RolesGuard)
  @RequireRole(Role.SCANNER)
  async syncOfflineValidations(
    @CurrentUser() user: { tenantId: string; id: string },
    @Body(new ZodValidationPipe(offlineValidationSyncBodySchema)) body: OfflineValidationSyncBody,
  ) {
    return this.ticketListExport.syncOfflineValidations(user.tenantId, user.id, body);
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
