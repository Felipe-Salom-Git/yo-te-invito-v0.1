import { resolveMailProviderKind } from './mail-config';

export function validateMailProviderEnv(): string[] {
  const missing: string[] = [];
  const kind = resolveMailProviderKind();

  if (kind === 'smtp') {
    if (!process.env.SMTP_HOST?.trim()) missing.push('SMTP_HOST');
    if (!process.env.SMTP_USER?.trim()) missing.push('SMTP_USER');
    if (!process.env.SMTP_PASSWORD) missing.push('SMTP_PASSWORD');
  } else if (!process.env.RESEND_API_KEY?.trim()) {
    missing.push('RESEND_API_KEY');
  }

  return missing;
}
