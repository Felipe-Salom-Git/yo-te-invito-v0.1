import type { MailProviderKind } from '../mail-config';
import type { SendEmailOptions, SendEmailResult } from '../send-email-options';

export interface MailProvider {
  readonly name: MailProviderKind;
  isConfigured(): boolean;
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}
