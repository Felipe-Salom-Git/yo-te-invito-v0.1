export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Override default `MAIL_FROM` / `EMAIL_FROM`. */
  from?: string;
  /** Override default `MAIL_REPLY_TO`. */
  replyTo?: string;
}

export type SendEmailResult =
  | { ok: true; providerMessageId?: string }
  | { ok: false; errorCode: string; retryable: boolean };
