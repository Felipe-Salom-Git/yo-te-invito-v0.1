/**
 * Getnet OAuth2 token service.
 * Uses client_credentials grant. Caches token in memory until expiry.
 * / Servicio de token OAuth2 para Getnet. Usa grant client_credentials.
 */

import { Injectable, Logger } from '@nestjs/common';
import { loadGetnetConfig } from './getnet.config';

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp ms
}

@Injectable()
export class GetnetAuthService {
  private readonly logger = new Logger(GetnetAuthService.name);
  private cache: TokenCache | null = null;
  private fetchingPromise: Promise<string> | null = null;

  async getAccessToken(): Promise<string> {
    const config = loadGetnetConfig();
    if (!config.enabled) {
      throw new Error('Getnet is not configured (missing client credentials)');
    }

    const now = Date.now();
    const bufferMs = config.tokenBufferSeconds * 1000;
    if (this.cache && this.cache.expiresAt > now + bufferMs) {
      return this.cache.accessToken;
    }

    if (this.fetchingPromise) {
      return this.fetchingPromise;
    }

    this.fetchingPromise = this.fetchToken(config);
    try {
      const token = await this.fetchingPromise;
      return token;
    } finally {
      this.fetchingPromise = null;
    }
  }

  private async fetchToken(config: ReturnType<typeof loadGetnetConfig>): Promise<string> {
    const url = `${config.authBaseUrl.replace(/\/$/, '')}/oauth/token`;
    const body = JSON.stringify({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: '*',
    });

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= (config.maxRetries ?? 2); attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const res = await this.doTokenRequest(url, body, controller.signal);
        clearTimeout(timeout);
        return res;
      } catch (e) {
        clearTimeout(timeout);
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < (config.maxRetries ?? 2)) {
          await new Promise((r) => setTimeout(r, config.retryDelayMs ?? 500));
        }
      }
    }
    throw lastError ?? new Error('Getnet auth failed');
  }

  private async doTokenRequest(url: string, body: string, signal: AbortSignal): Promise<string> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
        signal,
      });

      const text = await res.text();
      let json: { access_token?: string; expires_in?: string | number };
      try {
        json = JSON.parse(text) as { access_token?: string; expires_in?: string | number };
      } catch {
        const preview = text.slice(0, 120).replace(/\s+/g, ' ').trim();
        this.logger.warn(`Getnet auth: non-JSON response status=${res.status} body="${preview}"`);
        const hint = res.status === 401
          ? ' Credenciales inválidas o no autorizadas.'
          : res.status >= 400
            ? ` Servidor respondió ${res.status}.`
            : '';
        throw new Error(
          `Getnet auth: respuesta inválida (${res.status}). Verifica credenciales y URLs.${hint}`,
        );
      }

      if (!res.ok) {
        this.logger.warn(`Getnet token request failed: status=${res.status}, body=${text.slice(0, 200)}`);
        throw new Error(`Getnet auth failed: ${res.status}`);
      }

      const accessToken = json.access_token;
      if (!accessToken) {
        this.logger.warn('Getnet token response missing access_token');
        throw new Error('Getnet auth: no access_token in response');
      }

      const expiresIn = typeof json.expires_in === 'string'
        ? parseInt(json.expires_in, 10)
        : json.expires_in ?? 3600;
      const expiresAt = Date.now() + expiresIn * 1000;

      this.cache = { accessToken, expiresAt };
      return accessToken;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        this.logger.warn('Getnet token request timed out');
        throw new Error('Getnet auth timeout');
      }
      throw e;
    }
  }

  /** Clear cached token (e.g. for tests). */
  clearCache(): void {
    this.cache = null;
  }
}
