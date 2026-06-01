import { resolveMailProviderKind } from '../mail-config';
import type { MailProvider } from './mail-provider.interface';
import { ResendMailProvider } from './resend-mail.provider';
import { SmtpMailProvider } from './smtp-mail.provider';

export function createMailProvider(): MailProvider {
  const kind = resolveMailProviderKind();
  if (kind === 'smtp') {
    return new SmtpMailProvider();
  }
  return new ResendMailProvider();
}
