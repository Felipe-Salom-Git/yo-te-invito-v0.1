/**
 * Getnet Web Checkout Redirect smoke (config / auth / payment-intent dry-run).
 *
 *   pnpm --filter api run smoke:getnet-webcheckout -- --config
 *   pnpm --filter api run smoke:getnet-webcheckout -- --auth
 *   pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --dry-run
 *   GETNET_WEBCHECKOUT_CONFIRM_PRE=yes pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --confirm --amount 100
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildWebCheckoutPaymentIntentUrl,
  loadGetnetWebCheckoutConfig,
} from '../src/modules/public-payments/providers/getnet/webcheckout/getnet-webcheckout.config';
import { GetnetWebCheckoutAuthService } from '../src/modules/public-payments/providers/getnet/webcheckout/getnet-webcheckout-auth.service';
import { GetnetWebCheckoutClientService } from '../src/modules/public-payments/providers/getnet/webcheckout/getnet-webcheckout-client.service';
import { buildCheckoutReturnUrl } from '../src/modules/public-payments/getnet-return-url.util';

function loadEnvFile() {
  try {
    const envPath = resolve(__dirname, '../.env');
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* no .env */
  }
}

function maskSecret(value: string | undefined): string {
  if (!value?.trim()) return '(not set)';
  const v = value.trim();
  if (v.length <= 4) return '****';
  return `${v.slice(0, 2)}…${v.slice(-2)} (${v.length} chars)`;
}

function formatOptionalMerchantId(value: string | undefined): string {
  if (!value?.trim()) return 'optional / not set';
  return maskSecret(value);
}

function parseArgs(argv: string[]) {
  const out = {
    config: false,
    auth: false,
    paymentIntent: false,
    confirm: false,
    dryRun: false,
    amount: 100,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') out.config = true;
    else if (a === '--auth') out.auth = true;
    else if (a === '--payment-intent') out.paymentIntent = true;
    else if (a === '--confirm') out.confirm = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--amount' && argv[i + 1]) {
      out.amount = parseInt(argv[++i], 10) || 100;
    } else if (a === '--help' || a === '-h') {
      console.log(`Usage:
  smoke:getnet-webcheckout -- --config
  smoke:getnet-webcheckout -- --auth
  smoke:getnet-webcheckout -- --payment-intent --dry-run
  GETNET_WEBCHECKOUT_CONFIRM_PRE=yes ... --payment-intent --confirm --amount 100`);
      process.exit(0);
    }
  }

  if (!out.config && !out.auth && !out.paymentIntent) {
    out.config = true;
  }
  return out;
}

function runConfig(): number {
  const config = loadGetnetWebCheckoutConfig();
  console.log('smoke:getnet-webcheckout — Web Checkout Redirect config\n');
  console.log(`GETNET_WEBCHECKOUT_ENV: ${config.env}`);
  console.log(`GETNET_WEBCHECKOUT_AUTH_BASE_URL: ${config.authBaseUrl}`);
  console.log(`GETNET_WEBCHECKOUT_API_BASE_URL: ${config.apiBaseUrl}`);
  console.log(`GETNET_WEBCHECKOUT_PAYMENT_INTENT_PATH: ${config.paymentIntentPath}`);
  console.log(`Payment-intent URL: ${buildWebCheckoutPaymentIntentUrl(config)}`);
  console.log(`GETNET_WEBCHECKOUT_MERCHANT_ID: ${formatOptionalMerchantId(config.merchantId)}`);
  console.log(`GETNET_WEBCHECKOUT_SELLER_ID: ${maskSecret(config.sellerId)}`);
  console.log(`GETNET_WEBCHECKOUT_CLIENT_ID: ${maskSecret(config.clientId)}`);
  console.log(`GETNET_WEBCHECKOUT_SECRET_KEY: ${maskSecret(config.secretKey)}`);
  console.log(`Enabled: ${config.enabled ? 'yes' : 'no'}`);
  console.log(
    `GETNET_WEBCHECKOUT_CONFIRM_PRE: ${process.env.GETNET_WEBCHECKOUT_CONFIRM_PRE ?? '(not set)'}`,
  );

  if (!config.enabled) {
    console.error(
      '\nFAIL: set GETNET_WEBCHECKOUT_CLIENT_ID, GETNET_WEBCHECKOUT_SECRET_KEY, GETNET_WEBCHECKOUT_SELLER_ID (MERCHANT_ID optional)',
    );
    return 1;
  }
  console.log('\nOK: Web Checkout credentials present.');
  return 0;
}

async function runAuth(): Promise<number> {
  const auth = new GetnetWebCheckoutAuthService();
  try {
    await auth.getAccessToken();
    console.log('OK: OAuth token obtained (value not printed).');
    return 0;
  } catch (e) {
    console.error(`FAIL: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv.slice(2));
  const config = loadGetnetWebCheckoutConfig();

  if (args.config) {
    const code = runConfig();
    if (code !== 0 && !args.auth && !args.paymentIntent) process.exit(code);
  }

  if (args.auth) {
    if (!config.enabled) {
      console.error('FAIL: configure GETNET_WEBCHECKOUT_* first');
      process.exit(1);
    }
    process.exit(await runAuth());
  }

  if (args.paymentIntent) {
    if (!config.enabled) {
      console.error('FAIL: configure GETNET_WEBCHECKOUT_* first');
      process.exit(1);
    }

    if (config.env === 'production' && args.confirm) {
      console.error('Refusing payment-intent POST in production from smoke script.');
      process.exit(1);
    }

    const orderId = `yti_smoke_${Date.now()}`;
    const paymentId = `pay_smoke_${Date.now()}`;
    const successUrl = buildCheckoutReturnUrl({ orderId, paymentId });
    const errorUrl = buildCheckoutReturnUrl({
      orderId,
      paymentId,
      cancelled: true,
    });

    const payloadPreview = {
      mode: 'instant',
      order_id: orderId,
      configurations: {
        '3ds': true,
        success_url: successUrl,
        error_url: errorUrl,
      },
      payment: { currency: 'ARS', amount: args.amount },
      product: [
        {
          product_type: 'service',
          title: 'Smoke Yo Te Invito',
          description: 'Entrada Yo Te Invito',
          value: args.amount,
          quantity: 1,
        },
      ],
      expires_at: '15m',
    };

    console.log('\n--- payment-intent payload (preview) ---');
    console.log(JSON.stringify(payloadPreview, null, 2));
    console.log(`POST ${buildWebCheckoutPaymentIntentUrl(config)}`);

    const live =
      args.confirm &&
      !args.dryRun &&
      process.env.GETNET_WEBCHECKOUT_CONFIRM_PRE === 'yes';

    if (!live) {
      console.log('\nDRY-RUN — no HTTP POST sent.');
      console.log(
        'Live PRE POST: GETNET_WEBCHECKOUT_CONFIRM_PRE=yes ... --payment-intent --confirm',
      );
      return;
    }

    const client = new GetnetWebCheckoutClientService(
      new GetnetWebCheckoutAuthService(),
    );
    try {
      const result = await client.createPaymentIntent({
        orderId,
        currency: 'ARS',
        amountMinor: args.amount,
        successUrl,
        errorUrl,
        products: [
          {
            productType: 'service',
            title: 'Smoke Yo Te Invito',
            description: 'Entrada Yo Te Invito',
            valueMinor: args.amount,
            quantity: 1,
          },
        ],
      });
      console.log('\nOK: payment-intent created');
      console.log(`payment_intent_id: ${result.paymentIntentId}`);
      console.log(`redirect_url: ${result.redirectUrl}`);
    } catch (e) {
      console.error(`FAIL: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
