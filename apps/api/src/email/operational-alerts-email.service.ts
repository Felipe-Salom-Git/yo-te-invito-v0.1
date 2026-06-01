import { Injectable, Logger } from '@nestjs/common';
import { resolveMailOperationsTo } from './mail-config';
import { EmailQueueService } from './email-queue.service';
import {
  adminPanelUrl,
  buildAdminEmailDeliveryFailedVariables,
  operationsRecipient,
} from './templates/admin-operational-email.util';
import { getDefaultSupportEmail } from './templates/email-template.util';
import type { EmailTemplateId } from './templates/email-template.types';

export type CriticalAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type EnqueueCriticalAlertInput = {
  alertTitle: string;
  alertMessage: string;
  severity?: CriticalAlertSeverity;
  occurredAt?: string;
  context?: string;
  adminUrl?: string;
  to?: string;
};

export type EnqueueNewEventPendingInput = {
  eventId: string;
  eventTitle: string;
  producerName: string;
  categoryName?: string | null;
  city?: string | null;
  createdAt?: string;
  to?: string;
};

export type EnqueueOperationalErrorInput = {
  errorTitle: string;
  errorMessage: string;
  severity?: CriticalAlertSeverity;
  moduleName?: string;
  occurredAt?: string;
  context?: string;
  adminUrl?: string;
  to?: string;
};

export type EnqueueEmailDeliveryFailedInput = {
  templateId: string;
  recipient: string;
  provider: string;
  errorCode?: string;
  errorMessage?: string;
  occurredAt?: string;
  context?: string;
  adminUrl?: string;
  to?: string;
};

export type EnqueueScannerCriticalErrorInput = {
  scannerLocation: string;
  errorMessage: string;
  eventTitle?: string | null;
  occurredAt?: string;
  context?: string;
  adminUrl?: string;
  to?: string;
};

export type EnqueueStorageUploadFailedInput = {
  entityType: string;
  entityId?: string;
  uploaderEmail?: string;
  fileName?: string;
  errorMessage: string;
  occurredAt?: string;
  context?: string;
  adminUrl?: string;
  to?: string;
};

/**
 * Envío de alertas operativas internas (templates `ADMIN_*`).
 * Fire-and-forget: no bloquea flujos de negocio si el email falla.
 */
@Injectable()
export class OperationalAlertsEmailService {
  private readonly logger = new Logger(OperationalAlertsEmailService.name);

  constructor(private readonly emailQueue: EmailQueueService) {}

  enqueueCriticalAlert(input: EnqueueCriticalAlertInput): void {
    void this.enqueueToOperations('ADMIN_CRITICAL_ALERT', input.to, {
      alertTitle: input.alertTitle,
      alertMessage: input.alertMessage,
      severity: input.severity ?? 'high',
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      context: input.context,
      adminUrl: input.adminUrl ?? adminPanelUrl(),
      supportEmail: getDefaultSupportEmail(),
    });
  }

  enqueueOperationalError(input: EnqueueOperationalErrorInput): void {
    void this.enqueueToOperations('ADMIN_OPERATIONAL_ERROR', input.to, {
      errorTitle: input.errorTitle,
      errorMessage: input.errorMessage,
      severity: input.severity ?? 'high',
      moduleName: input.moduleName,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      context: input.context,
      adminUrl: input.adminUrl ?? adminPanelUrl(),
      supportEmail: getDefaultSupportEmail(),
    });
  }

  notifyNewEventPending(input: EnqueueNewEventPendingInput): void {
    const adminEventUrl = adminPanelUrl(`/admin/eventos/${input.eventId}`);
    void this.enqueueToOperations('ADMIN_NEW_EVENT_PENDING', input.to, {
      eventTitle: input.eventTitle,
      producerName: input.producerName,
      categoryName: input.categoryName ?? '',
      city: input.city ?? '',
      createdAt: input.createdAt ?? new Date().toISOString(),
      adminEventUrl,
      adminDashboardUrl: adminPanelUrl('/admin/eventos'),
      supportEmail: getDefaultSupportEmail(),
      operationsEmail: operationsRecipient() ?? getDefaultSupportEmail(),
    });
  }

  notifyEmailDeliveryFailed(input: EnqueueEmailDeliveryFailedInput): void {
    void this.enqueueToOperations(
      'ADMIN_EMAIL_DELIVERY_FAILED',
      input.to,
      buildAdminEmailDeliveryFailedVariables({
        templateId: input.templateId,
        recipient: input.recipient,
        provider: input.provider,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
        occurredAt: input.occurredAt,
        context: input.context,
        adminUrl: input.adminUrl,
      }),
    );
  }

  notifyScannerCriticalError(input: EnqueueScannerCriticalErrorInput): void {
    void this.enqueueToOperations('ADMIN_SCANNER_CRITICAL_ERROR', input.to, {
      scannerLocation: input.scannerLocation,
      eventTitle: input.eventTitle ?? '',
      errorMessage: input.errorMessage,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      context: input.context,
      adminUrl: input.adminUrl ?? adminPanelUrl('/admin/auditoria'),
      supportEmail: getDefaultSupportEmail(),
    });
  }

  notifyStorageUploadFailed(input: EnqueueStorageUploadFailedInput): void {
    void this.enqueueToOperations('ADMIN_STORAGE_UPLOAD_FAILED', input.to, {
      entityType: input.entityType,
      entityId: input.entityId ?? '',
      uploaderEmail: input.uploaderEmail ?? '',
      fileName: input.fileName ?? '',
      errorMessage: input.errorMessage,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      context: input.context,
      adminUrl: input.adminUrl ?? adminPanelUrl(),
      supportEmail: getDefaultSupportEmail(),
    });
  }

  private enqueueToOperations(
    templateId: EmailTemplateId,
    to: string | undefined,
    variables: Record<string, unknown>,
  ): void {
    const recipient = to?.trim() || resolveMailOperationsTo();
    if (!recipient) {
      this.logger.warn(`enqueue ${templateId}: no recipient (set MAIL_OPERATIONS_TO)`);
      return;
    }

    void this.emailQueue
      .enqueueTemplate({
        templateId,
        to: recipient,
        variables,
      })
      .catch((err) => {
        this.logger.error(`enqueue ${templateId} failed`, err);
      });
  }
}
