import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  getnetWebhookBodySchema,
  type GetnetWebhookResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationalAlertsEmailService } from '../../email/operational-alerts-email.service';
import { GetnetReconciliationService } from './getnet-reconciliation.service';
import { loadGetnetWebhookConfig } from './providers/getnet/getnet-webhook.config';
import {
  appendWebhookEventMetadata,
  appendWebCheckoutWebhookMetadata,
  buildWebhookIdempotencyKey,
  extractGetnetExternalPaymentId,
  extractGetnetPaymentLookupKeys,
  extractGetnetRemoteStatus,
  extractGetnetWebCheckoutWebhookInfo,
  extractGetnetWebhookEventId,
  hashWebhookPayload,
  isDuplicateWebhookEvent,
  readPaymentWebhookMetadata,
  sanitizeWebhookBodyForStorage,
  verifyWebhookSecret,
  verifyWebhookBasicAuth,
  type StoredWebhookEvent,
} from './providers/getnet/getnet-webhook.util';

export type HandleGetnetWebhookInput = {
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class GetnetWebhookService {
  private readonly logger = new Logger(GetnetWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reconciliation: GetnetReconciliationService,
    private readonly operationalAlerts: OperationalAlertsEmailService,
  ) {}

  async handleWebhook(input: HandleGetnetWebhookInput): Promise<GetnetWebhookResponse> {
    this.assertWebhookAuthorized(input.headers);

    const parsed = getnetWebhookBodySchema.safeParse(input.body);
    if (!parsed.success) {
      this.logger.warn(`Getnet webhook invalid payload: ${parsed.error.message}`);
      return {
        ok: false,
        outcome: 'invalid_payload',
        message: 'Invalid webhook payload',
      };
    }

    const body = parsed.data;
    const lookupKeys = extractGetnetPaymentLookupKeys(body);
    const externalPaymentId = extractGetnetExternalPaymentId(body);
    const remoteStatus = extractGetnetRemoteStatus(body);
    const webCheckoutInfo = extractGetnetWebCheckoutWebhookInfo(body);

    if (!externalPaymentId || !remoteStatus) {
      return {
        ok: false,
        outcome: 'invalid_payload',
        message: 'Missing payment reference or status',
      };
    }

    const sanitized = sanitizeWebhookBodyForStorage(
      body as Record<string, unknown>,
    );
    const payloadHash = hashWebhookPayload(sanitized);
    const eventId = extractGetnetWebhookEventId(body);
    const idempotencyKey = buildWebhookIdempotencyKey({
      eventId,
      externalPaymentId,
      remoteStatus,
      payloadHash,
    });

    const payment = await this.findGetnetPayment(lookupKeys, body.tenantId);

    if (!payment) {
      this.logger.warn(
        `Getnet webhook: payment not found paymentIntentId=${lookupKeys.paymentIntentId ?? 'n/a'} orderId=${lookupKeys.orderId ?? 'n/a'} resultPaymentId=${lookupKeys.resultPaymentId ?? 'n/a'}`,
      );
      this.operationalAlerts.enqueueCriticalAlert({
        alertTitle: 'Getnet webhook sin pago local',
        alertMessage: `No se encontró Payment GETNET para referencia externa ${externalPaymentId}. Estado remoto: ${remoteStatus}.`,
        severity: 'high',
        context: `eventId=${eventId ?? 'n/a'} idempotencyKey=${idempotencyKey}`,
      });
      return {
        ok: false,
        outcome: 'payment_not_found',
        message: 'Payment not found',
      };
    }

    const meta = readPaymentWebhookMetadata(payment.metadata);
    if (isDuplicateWebhookEvent(meta, idempotencyKey)) {
      return {
        ok: true,
        outcome: 'duplicate',
        paymentId: payment.id,
        orderId: payment.orderId,
        message: 'Event already processed',
      };
    }

    try {
      const reconcileResult = await this.reconciliation.reconcilePayment(
        payment.id,
        {
          source: 'GETNET_WEBHOOK',
          remoteStatusOverride: remoteStatus,
          tenantId: body.tenantId,
        },
      );

      const processedOutcome = `reconcile:${reconcileResult.outcome}`;
      await this.persistWebhookEvent(payment.id, payment.metadata, {
        receivedAt: new Date().toISOString(),
        eventId: eventId ?? undefined,
        externalPaymentId,
        remoteStatus,
        source: 'GETNET_WEBHOOK',
        processedOutcome,
        payloadHash,
        idempotencyKey,
      }, {
        webCheckoutInfo,
        remoteStatus,
        processedOutcome,
        sanitizedPayload: sanitized,
      });

      return {
        ok: reconcileResult.outcome !== 'PAYMENT_NOT_FOUND',
        outcome: this.mapReconcileToWebhookOutcome(reconcileResult.outcome),
        paymentId: payment.id,
        orderId: payment.orderId,
        fulfillOutcome: reconcileResult.fulfillOutcome,
        message: reconcileResult.message ?? processedOutcome,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Getnet webhook processing failed: ${msg}`, e instanceof Error ? e.stack : undefined);
      this.operationalAlerts.enqueueOperationalError({
        errorTitle: 'Error procesando webhook Getnet',
        errorMessage: msg,
        severity: 'critical',
        moduleName: 'GetnetWebhookService',
        context: `paymentId=${payment.id} orderId=${payment.orderId}`,
      });
      throw e;
    }
  }

  private mapReconcileToWebhookOutcome(
    outcome: string,
  ): GetnetWebhookResponse['outcome'] {
    switch (outcome) {
      case 'UNKNOWN_REMOTE':
        return 'unknown_status';
      case 'IGNORED_REMOTE':
        return 'ignored';
      case 'PAYMENT_NOT_FOUND':
        return 'payment_not_found';
      default:
        return 'processed';
    }
  }

  private assertWebhookAuthorized(
    headers: Record<string, string | string[] | undefined>,
  ): void {
    const config = loadGetnetWebhookConfig();

    if (config.authMode === 'basic') {
      const authHeader = this.readHeader(headers, 'authorization');
      if (config.requireSecret) {
        if (!config.basicUser || !config.basicPassword) {
          this.logger.error(
            'GETNET_WEBHOOK_BASIC_USER/PASSWORD required for basic auth mode',
          );
          throw new UnauthorizedException('Webhook not configured');
        }
        if (
          !verifyWebhookBasicAuth(
            authHeader,
            config.basicUser,
            config.basicPassword,
          )
        ) {
          throw new UnauthorizedException('Invalid webhook basic auth');
        }
      } else if (config.basicUser && config.basicPassword) {
        if (
          !verifyWebhookBasicAuth(
            authHeader,
            config.basicUser,
            config.basicPassword,
          )
        ) {
          throw new UnauthorizedException('Invalid webhook basic auth');
        }
      }
      return;
    }

    if (!config.requireSecret) {
      if (config.secret) {
        const provided = this.readHeader(headers, config.headerName);
        if (!verifyWebhookSecret(provided, config.secret)) {
          throw new UnauthorizedException('Invalid webhook secret');
        }
      }
      return;
    }

    if (!config.secret) {
      this.logger.error('GETNET_WEBHOOK_SECRET required but not configured');
      throw new UnauthorizedException('Webhook not configured');
    }

    const provided = this.readHeader(headers, config.headerName);
    if (!verifyWebhookSecret(provided, config.secret)) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }

  private readHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const lower = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() !== lower) continue;
      if (Array.isArray(value)) return value[0];
      return value;
    }
    return undefined;
  }

  private async findGetnetPayment(
    keys: ReturnType<typeof extractGetnetPaymentLookupKeys>,
    tenantId?: string,
  ) {
    const baseWhere = {
      provider: 'GETNET' as const,
      ...(tenantId ? { tenantId } : {}),
    };

    const lookupIds = [
      keys.paymentIntentId,
      keys.resultPaymentId,
      keys.legacyExternalId,
    ].filter((id): id is string => !!id);

    for (const id of lookupIds) {
      const direct = await this.prisma.payment.findFirst({
        where: {
          ...baseWhere,
          OR: [
            { externalReference: id },
            { externalPaymentId: id },
          ],
        },
        select: {
          id: true,
          orderId: true,
          metadata: true,
        },
      });
      if (direct) return direct;
    }

    if (keys.orderId) {
      const byOrder = await this.prisma.payment.findFirst({
        where: {
          ...baseWhere,
          orderId: keys.orderId,
        },
        select: {
          id: true,
          orderId: true,
          metadata: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (byOrder) return byOrder;
    }

    const candidates = await this.prisma.payment.findMany({
      where: baseWhere,
      select: {
        id: true,
        orderId: true,
        metadata: true,
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    const metaMatch = candidates.find((p) => {
      if (!p.metadata || typeof p.metadata !== 'object') return false;
      const meta = p.metadata as Record<string, unknown>;
      return lookupIds.some((id) => meta.paymentIntentId === id);
    });
    if (metaMatch) return metaMatch;

    if (keys.orderId) {
      return (
        candidates.find((p) => p.orderId === keys.orderId) ?? null
      );
    }

    return null;
  }

  private async persistWebhookEvent(
    paymentId: string,
    existingMetadata: unknown,
    event: StoredWebhookEvent,
    webCheckout?: {
      webCheckoutInfo: ReturnType<typeof extractGetnetWebCheckoutWebhookInfo>;
      remoteStatus: string;
      processedOutcome: string;
      sanitizedPayload: Record<string, unknown>;
    },
  ): Promise<void> {
    let nextMeta = appendWebhookEventMetadata(
      existingMetadata,
      event,
      event.idempotencyKey,
    );
    if (
      webCheckout?.webCheckoutInfo.webCheckoutStatusRaw ||
      webCheckout?.webCheckoutInfo.paymentIntentId ||
      webCheckout?.webCheckoutInfo.checkoutId
    ) {
      nextMeta = appendWebCheckoutWebhookMetadata(nextMeta, {
        info: webCheckout.webCheckoutInfo,
        remoteStatus: webCheckout.remoteStatus,
        processedOutcome: webCheckout.processedOutcome,
        sanitizedPayload: webCheckout.sanitizedPayload,
      });
    }
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { metadata: nextMeta as Prisma.InputJsonValue },
    });
  }
}
