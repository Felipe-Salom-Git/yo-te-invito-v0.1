import { request } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3001';

export default async function globalSetup() {
  let apiOk = false;
  try {
    const ctx = await request.newContext();
    const res = await ctx.get(`${API_BASE}/health`, { timeout: 8_000 });
    apiOk = res.ok();
    await ctx.dispose();
  } catch {
    apiOk = false;
  }

  process.env.E2E_API_AVAILABLE = apiOk ? '1' : '0';

  if (process.env.E2E_SEED === '1') {
    console.warn(
      '[e2e] E2E_SEED=1 is ignored: automatic demo:seed was removed to protect real users and data.',
    );
    console.warn(
      '[e2e] Use an existing account (E2E_USER_EMAIL / E2E_USER_PASSWORD) or skip API-dependent tests.',
    );
  }

  if (!apiOk) {
    console.warn(
      `[e2e] API not reachable at ${API_BASE}. Portal tests that need the API will be skipped.`,
    );
  }
}
