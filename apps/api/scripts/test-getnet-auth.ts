/**
 * Verifica OAuth Getnet sin imprimir secretos.
 * Uso: pnpm --filter api run test:getnet-auth
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { loadGetnetConfig } from '../src/modules/public-payments/providers/getnet/getnet.config';

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

loadEnvFile();

async function main() {
  const config = loadGetnetConfig();
  if (!config.enabled) {
    console.error('FAIL: faltan GETNET_CLIENT_ID / GETNET_CLIENT_SECRET en apps/api/.env');
    process.exit(1);
  }

  const url = `${config.authBaseUrl.replace(/\/$/, '')}/oauth/token`;
  console.log(`Auth URL: ${url}`);
  console.log(`Checkout URL: ${config.checkoutBaseUrl}`);
  console.log(`Scope: ${config.scope}`);
  console.log(`Client ID: ${config.clientId.slice(0, 8)}…`);

  const scopesToTry = [...new Set([config.scope, 'api_orders_post', '*'])];
  for (const scope of scopesToTry) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope,
      }),
    });
    const text = await res.text();
    if (res.ok) {
      console.log(`OK: token obtenido (HTTP ${res.status}, scope=${scope})`);
      process.exit(0);
    }
    console.error(`FAIL scope=${scope}: HTTP ${res.status}`);
    if (text.length > 0 && text.length < 400) console.error('Body:', text);
  }

  console.error('\n--- Diagnóstico ---');
  console.error(`GETNET_ENV=${process.env.GETNET_ENV ?? '(no set)'}`);
  console.error(`client_id length=${config.clientId.length}, client_secret length=${config.clientSecret.length}`);
  if (config.clientId !== config.clientId.trim() || config.clientSecret !== config.clientSecret.trim()) {
    console.error('AVISO: hay espacios al inicio/fin en .env — quitálos.');
  }
  console.error(`
El servidor de Getnet respondió authentication_failed (401).
Eso NO es un fallo del script: rechazó client_id + client_secret para ${config.authBaseUrl}.

Checklist:
  1. Copiá de nuevo ID y SECRET desde el portal Getnet (sin espacios ni comillas extra).
  2. Confirmá que son credenciales de PRODUCCIÓN si GETNET_ENV=production (o staging si GETNET_ENV=staging).
  3. Preguntá a Santander si el comercio/app está activo: support@santander.com.ar
  4. Mientras tanto, en la app usá "Pagar (demo)" para probar el flujo sin Getnet.
`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
