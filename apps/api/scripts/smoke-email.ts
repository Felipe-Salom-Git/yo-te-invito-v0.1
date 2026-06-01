/**
 * Smoke: envío controlado de un email de prueba (un destinatario).
 * No usa API HTTP ni pagos.
 *
 * Requerido: SMOKE_EMAIL_TO
 * Según MAIL_PROVIDER: SMTP_* o RESEND_API_KEY
 *
 * Ejemplo:
 *   SMOKE_EMAIL_TO=soporte@yoteinvito.club pnpm --filter api run smoke:email
 */
import { resolveMailProviderKind } from '../src/email/mail-config';
import { validateMailProviderEnv } from '../src/email/mail-config.validation';
import { createMailProvider } from '../src/email/providers/create-mail-provider';

async function main(): Promise<number> {
  const to = process.env.SMOKE_EMAIL_TO?.trim();
  if (!to) {
    console.error('\n[smoke:email] SMOKE_EMAIL_TO is required.');
    console.error('Example: SMOKE_EMAIL_TO=soporte@yoteinvito.club pnpm --filter api run smoke:email\n');
    return 1;
  }

  let providerKind: string;
  try {
    providerKind = resolveMailProviderKind();
  } catch (err) {
    console.error('[smoke:email]', err instanceof Error ? err.message : err);
    return 1;
  }

  const missing = validateMailProviderEnv();
  if (missing.length > 0) {
    console.error(
      `[smoke:email] Missing env for MAIL_PROVIDER=${providerKind}: ${missing.join(', ')}`,
    );
    return 1;
  }

  const provider = createMailProvider();
  if (!provider.isConfigured()) {
    console.error(`[smoke:email] Provider "${provider.name}" is not configured.`);
    return 1;
  }

  console.log(`[smoke:email] provider=${provider.name} to=${to}`);

  const result = await provider.send({
    to,
    subject: 'Yo Te Invito — smoke:email',
    html: '<p>Email de prueba del script <code>smoke:email</code>.</p>',
    text: 'Email de prueba del script smoke:email.',
  });

  if (!result.ok) {
    console.error(`[smoke:email] Send failed: ${result.errorCode}`);
    return 1;
  }

  console.log(
    `[smoke:email] OK${result.providerMessageId ? ` messageId=${result.providerMessageId}` : ''}`,
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('[smoke:email]', err);
    process.exit(1);
  });
