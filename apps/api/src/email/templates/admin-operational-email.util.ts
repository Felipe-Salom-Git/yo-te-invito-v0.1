import type { EmailTemplateId } from './email-template.types';
import { getAppUrl, getCurrentYear, getDefaultSupportEmail } from './email-template.util';
import { resolveMailOperationsTo } from '../mail-config';

export type AdminEmailDeliveryFailedVariablesInput = {
  templateId: string;
  recipient: string;
  provider: string;
  errorCode?: string;
  errorMessage?: string;
  occurredAt?: string;
  context?: string;
  adminUrl?: string;
};

/** Variables for `ADMIN_EMAIL_DELIVERY_FAILED` (shared by queue + operational alerts). */
export function buildAdminEmailDeliveryFailedVariables(
  input: AdminEmailDeliveryFailedVariablesInput,
): Record<string, unknown> {
  return {
    templateId: input.templateId,
    recipient: input.recipient,
    provider: input.provider,
    errorCode: input.errorCode ?? 'SEND_FAILED',
    errorMessage: input.errorMessage,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    context: input.context,
    adminUrl: input.adminUrl ?? adminPanelUrl(),
    supportEmail: getDefaultSupportEmail(),
  };
}

const INTERNAL_OPERATIONAL_TEMPLATE_IDS: ReadonlySet<EmailTemplateId> = new Set([
  'ADMIN_CRITICAL_ALERT',
  'ADMIN_NEW_EVENT_PENDING',
  'ADMIN_OPERATIONAL_ERROR',
  'ADMIN_EMAIL_DELIVERY_FAILED',
  'ADMIN_SCANNER_CRITICAL_ERROR',
  'ADMIN_STORAGE_UPLOAD_FAILED',
]);

export function isInternalOperationalEmailTemplate(templateId: string): boolean {
  return INTERNAL_OPERATIONAL_TEMPLATE_IDS.has(templateId as EmailTemplateId);
}

export function adminPanelUrl(path = '/admin'): string {
  const base = getAppUrl().replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function operationsRecipient(): string | undefined {
  return resolveMailOperationsTo();
}

export function adminEmailFooterYear(): string {
  return String(getCurrentYear());
}
