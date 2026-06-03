import { Injectable, Logger } from '@nestjs/common';
import { loadGetnetWebCheckoutConfig } from './getnet-webcheckout.config';
import type { GetnetWebCheckoutConfig } from './getnet-webcheckout.types';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

@Injectable()
export class GetnetWebCheckoutAuthService {
  private readonly logger = new Logger(GetnetWebCheckoutAuthService.name);
  private cache: TokenCache | null = null;
  private fetchingPromise: Promise<string> | null = null;

  async getAccessToken(): Promise<string> {
    const config = loadGetnetWebCheckoutConfig();
    if (!config.enabled) {
      throw new Error(
        'Getnet Web Checkout is not configured (GETNET_WEBCHECKOUT_* or GETNET_GLOBAL_* missing)',
      );
    }

    const now = Date.now();
    const bufferMs = 60_000;
    if (this.cache && this.cache.expiresAt > now + bufferMs) {
      return this.cache.accessToken;
    }

    if (this.fetchingPromise) {
      return this.fetchingPromise;
    }

    this.fetchingPromise = this.fetchToken(config);
    try {
      return await this.fetchingPromise;
    } finally {
      this.fetchingPromise = null;
    }
  }

  clearCache(): void {
    this.cache = null;
  }

  private async fetchToken(config: GetnetWebCheckoutConfig): Promise<string> {
    const endpoint = config.authBaseUrl.replace(/\/$/, '');
    const bodyParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.secretKey,
    });
    if (config.scope) bodyParams.set('scope', config.scope);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const token = await this.doTokenRequest(
          endpoint,
          bodyParams.toString(),
          controller.signal,
        );
        clearTimeout(timeout);
        return token;
      } catch (e) {
        clearTimeout(timeout);
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < config.maxRetries) {
          await new Promise((r) => setTimeout(r, config.retryDelayMs));
        }
      }
    }
    throw lastError ?? new Error('Getnet Web Checkout auth failed');
  }

  private async doTokenRequest(
    endpoint: string,
    body: string,
    signal: AbortSignal,
  ): Promise<string> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
      signal,
    });

    const text = await res.text();
    let json: {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };

    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      this.logger.warn(
        `Web Checkout auth non-JSON response status=${res.status}`,
      );
      throw new Error(`Getnet Web Checkout auth invalid response (${res.status})`);
    }

    if (!res.ok || !json.access_token) {
      const detail =
        json.error_description || json.error || `HTTP ${res.status}`;
      if (res.status === 401) {
        throw new Error(
          `Getnet Web Checkout auth failed: invalid credentials for ${endpoint}`,
        );
      }
      throw new Error(`Getnet Web Checkout auth failed: ${detail}`);
    }

    const expiresIn = json.expires_in ?? 3600;
    this.cache = {
      accessToken: json.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    return json.access_token;
  }
}
