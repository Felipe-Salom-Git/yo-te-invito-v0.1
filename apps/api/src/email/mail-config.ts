export type MailProviderKind = 'smtp' | 'resend';

const DEFAULT_MAIL_FROM = 'Yo Te Invito <no_reply@yoteinvito.club>';

export function resolveMailProviderKind(): MailProviderKind {
  const raw = (process.env.MAIL_PROVIDER ?? 'resend').trim().toLowerCase();
  if (raw === 'smtp') return 'smtp';
  if (raw === 'resend') return 'resend';
  throw new Error(`Invalid MAIL_PROVIDER="${raw}". Expected "smtp" or "resend".`);
}

export function resolveMailFrom(): string {
  return (
    process.env.MAIL_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    DEFAULT_MAIL_FROM
  );
}

export function resolveMailReplyTo(): string | undefined {
  const value = process.env.MAIL_REPLY_TO?.trim();
  return value || undefined;
}

export function resolveMailOperationsTo(): string | undefined {
  return (
    process.env.MAIL_OPERATIONS_TO?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    undefined
  );
}
