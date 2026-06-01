import { escapeHtml } from './email-template.util';

export const REFERRAL_EMAIL_DISCLAIMER_TEXT =
  'Yo Te Invito funciona como portal de comunicación y registro entre productoras y referidos. La plataforma no administra fondos, no retiene dinero, no ejecuta transferencias y no garantiza pagos entre las partes. Los pagos y acuerdos económicos se gestionan de forma externa entre productora y referido.';

export function referralDisclaimerHtml(): string {
  return `<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">${escapeHtml(REFERRAL_EMAIL_DISCLAIMER_TEXT)}</p>`;
}
