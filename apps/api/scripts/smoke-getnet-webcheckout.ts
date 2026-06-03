/**
 * Getnet Web Checkout Redirect smoke (config / auth / payment-intent dry-run).
 *
 *   pnpm --filter api run smoke:getnet-webcheckout -- --config
 *   pnpm --filter api run smoke:getnet-webcheckout -- --auth
 *   pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --dry-run
 *   GETNET_WEBCHECKOUT_CONFIRM_PRE=yes pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --confirm --amount 100
 *   GETNET_WEBCHECKOUT_CONFIRM_PROD=yes pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --confirm --amount 50000
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildWebCheckoutPaymentIntentUrl,
  loadGetnetWebCheckoutConfig,
} from '../src/modules/public-payments/providers/getnet/webcheckout/getnet-webcheckout.config';
import { GetnetWebCheckoutAuthService } from '../src/modules/public-payments/providers/getnet/webcheckout/getnet-webcheckout-auth.service';
import { GetnetWebCheckoutClientService } from '../src/modules/public-payments/providers/getnet/webcheckout/getnet-webcheckout-client.service';
import { buildWebCheckoutCustomer } from '../src/modules/public-payments/providers/getnet/webcheckout/getnet-webcheckout-customer.util';

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
  GETNET_WEBCHECKOUT_CONFIRM_PRE=yes ... --payment-intent --confirm --amount 100
  GETNET_WEBCHECKOUT_CONFIRM_PROD=yes ... --payment-intent --confirm --amount 50000`);
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
  console.log('smoke:getnet-webcheckout — Web Checkout Redirect (production contract)\n');
  console.log(`ENV: ${config.env}`);
  console.log(`Auth URL: ${config.authBaseUrl}`);
  console.log(`Web Checkout base: ${config.webCheckoutBaseUrl}`);
  console.log(`Payment-intent path: ${config.paymentIntentPath}`);
  console.log(`Payment-intent URL: ${buildWebCheckoutPaymentIntentUrl(config)}`);
  console.log(`Auth: client_id + client_secret in form body (not Basic Auth)`);
  console.log(`MERCHANT_ID: ${formatOptionalMerchantId(config.merchantId)}`);
  console.log(`SELLER_ID: ${maskSecret(config.sellerId)}`);
  console.log(`CLIENT_ID: ${maskSecret(config.clientId)}`);
  console.log(`SECRET_KEY: ${maskSecret(config.secretKey)}`);
  console.log(`Enabled: ${config.enabled ? 'yes' : 'no'}`);
  console.log(
    `GETNET_WEBCHECKOUT_CONFIRM_PRE: ${process.env.GETNET_WEBCHECKOUT_CONFIRM_PRE ?? '(not set)'}`,
  );
  console.log(
    `GETNET_WEBCHECKOUT_CONFIRM_PROD: ${process.env.GETNET_WEBCHECKOUT_CONFIRM_PROD ?? '(not set)'}`,
  );

  if (!config.enabled) {
    console.error(
      '\nFAIL: set seller_id, client_id, secret_key (GETNET_WEBCHECKOUT_* or GETNET_GLOBAL_*). MERCHANT_ID optional.',
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

function resolveLiveConfirm(config: ReturnType<typeof loadGetnetWebCheckoutConfig>): {
  live: boolean;
  reason?: string;
} {
  if (config.env === 'production') {
    if (process.env.GETNET_WEBCHECKOUT_CONFIRM_PROD !== 'yes') {
      return {
        live: false,
        reason:
          'Production POST blocked. Set GETNET_WEBCHECKOUT_CONFIRM_PROD=yes explicitly.',
      };
    }
    console.warn(
      '\n*** WARNING: live payment-intent POST to PRODUCTION Getnet ***\n',
    );
    return { live: true };
  }
  if (process.env.GETNET_WEBCHECKOUT_CONFIRM_PRE === 'yes') {
    return { live: true };
  }
  return {
    live: false,
    reason: 'PRE POST requires GETNET_WEBCHECKOUT_CONFIRM_PRE=yes',
  };
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
      console.error('FAIL: configure GETNET_WEBCHECKOUT_* or GETNET_GLOBAL_* first');
      process.exit(1);
    }
    process.exit(await runAuth());
  }

  if (args.paymentIntent) {
    if (!config.enabled) {
      console.error('FAIL: configure GETNET_WEBCHECKOUT_* or GETNET_GLOBAL_* first');
      process.exit(1);
    }

    const orderId = `yti_smoke_${Date.now()}`;
    const customer = buildWebCheckoutCustomer({
      id: orderId,
      buyerEmail: 'smoke@yoteinvito.club',
      buyerFirstName: 'Smoke',
      buyerLastName: 'Test',
      buyerDocument: null,
    });

    const payloadPreview = {
      order_id: orderId,
      payment: { currency: 'ARS', amount: args.amount },
      product: [
        {
          product_type: 'physical_goods',
          title: 'Smoke Yo Te Invito',
          description: 'Entrada Yo Te Invito',
          value: args.amount,
          quantity: 1,
        },
      ],
      customer,
    };

    console.log('\n--- payment-intent payload (preview) ---');
    console.log(JSON.stringify(payloadPreview, null, 2));
    console.log(`POST ${buildWebCheckoutPaymentIntentUrl(config)}`);
    console.log('V1: use redirect_url from response (no iframe/lightbox).');

    const confirmGate = resolveLiveConfirm(config);
    const live = args.confirm && !args.dryRun && confirmGate.live;

    if (!live) {
      console.log('\nDRY-RUN — no HTTP POST sent.');
      if (confirmGate.reason) console.log(confirmGate.reason);
      console.log(
        'Live PRE: GETNET_WEBCHECKOUT_CONFIRM_PRE=yes ... --payment-intent --confirm',
      );
      console.log(
        'Live PROD: GETNET_WEBCHECKOUT_CONFIRM_PROD=yes ... --payment-intent --confirm',
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
        products: [
          {
            productType: 'physical_goods',
            title: 'Smoke Yo Te Invito',
            description: 'Entrada Yo Te Invito',
            valueMinor: args.amount,
            quantity: 1,
          },
        ],
        customer: {
          customerId: customer.customer_id,
          firstName: customer.first_name,
          lastName: customer.last_name,
          name: customer.name,
          email: customer.email,
          documentNumber: customer.document_number,
        },
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
