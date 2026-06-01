import type { EmailTemplateId } from './email-template.types';
import { getAppUrl, getCurrentYear } from './email-template.util';
import { resolveMailOperationsTo } from '../mail-config';

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
