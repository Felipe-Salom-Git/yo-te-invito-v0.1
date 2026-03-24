/**
 * Getnet Checkout API client.
 * Creates payment intent (order) and queries order status.
 * / Cliente API de Getnet Checkout. Crea intención de pago y consulta estado.
 */

import { Injectable, Logger } from '@nestjs/common';
import { loadGetnetConfig } from './getnet.config';
import { GetnetAuthService } from './getnet-auth.service';

export interface GetnetOrderItem {
  id: number | string;
  name: string;
  unitPrice: { currency: string; amount: number };
  quantity: number;
}

export interface CreateGetnetOrderInput {
  currency: string; // ISO 4217 numeric e.g. "032" for ARS
  items: GetnetOrderItem[];
  /** Local order reference for reconciliation */
  reference?: string;
}

export interface GetnetOrderResponse {
  uuid: string;
  checkoutUrl: string;
  raw?: unknown;
}

export type GetnetRemoteStatus = 'SUCCESS' | 'APPROVED' | 'PENDING' | 'FAILED' | 'REJECTED' | 'EXPIRED' | 'unknown';

export interface GetnetOrderStatusResponse {
  uuid: string;
  status: GetnetRemoteStatus;
  paymentStatus?: string;
  raw?: unknown;
}

/** ISO 4217 numeric codes */
const CURRENCY_MAP: Record<string, string> = {
  ARS: '032',
  USD: '840',
};

@Injectable()
export class GetnetCheckoutService {
  private readonly logger = new Logger(GetnetCheckoutService.name);

  constructor(private readonly auth: GetnetAuthService) {}

  async createOrder(input: CreateGetnetOrderInput): Promise<GetnetOrderResponse> {
    const config = loadGetnetConfig();
    if (!config.enabled) {
      throw new Error('Getnet is not configured');
    }

    const currency = CURRENCY_MAP[input.currency] ?? input.currency;
    const payload = {
      data: {
        type: 'orders',
        attributes: {
          currency,
          items: input.items.map((it) => ({
            id: typeof it.id === 'string' ? parseInt(it.id, 10) || 1 : it.id,
            name: it.name,
            unitPrice: {
              currency,
              amount: it.unitPrice.amount,
            },
            quantity: it.quantity,
          })),
        },
      },
    };

    const token = await this.auth.getAccessToken();
    const url = `${config.checkoutBaseUrl.replace(/\/$/, '')}/api/v2/orders`;
    const maxRetries = config.maxRetries ?? 2;
    const retryDelayMs = config.retryDelayMs ?? 500;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const result = await this.doCreateOrder(url, token, payload, controller.signal);
        clearTimeout(timeout);
        return result;
      } catch (e) {
        clearTimeout(timeout);
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, retryDelayMs));
        }
      }
    }
    throw lastError ?? new Error('Getnet order creation failed');
  }

  private async doCreateOrder(
    url: string,
    token: string,
    payload: object,
    signal: AbortSignal,
  ): Promise<GetnetOrderResponse> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal,
      });
      const text = await res.text();
      let json: {
        data?: { attributes?: { uuid?: string; links?: { checkout?: string } }; id?: string; links?: { checkout?: string } };
        errors?: Array<{ detail?: string }>;
      };
      try {
        json = JSON.parse(text) as typeof json;
      } catch {
        const preview = text.slice(0, 150).replace(/\s/g, ' ');
        this.logger.warn(`Getnet order response is not JSON (status=${res.status}). Preview: ${preview}`);
        throw new Error(
          `Getnet order: invalid response (status ${res.status}). Server may have returned HTML or non-JSON.`,
        );
      }
      if (!res.ok) {
        const errDetail = json.errors?.[0]?.detail ?? `HTTP ${res.status}`;
        this.logger.warn(`Getnet order creation failed: ${errDetail}`);
        throw new Error(`Getnet order creation failed: ${errDetail}`);
      }

      const data = json.data;
      const attrs = data?.attributes;
      const uuid = attrs?.uuid ?? data?.id ?? '';
      const checkoutUrl =
        attrs?.links?.checkout ?? (data as { links?: { checkout?: string } })?.links?.checkout ?? '';

      if (!checkoutUrl) {
        this.logger.warn('Getnet order response missing checkout link');
        throw new Error('Getnet order creation: no checkout URL in response');
      }

      return {
        uuid,
        checkoutUrl,
        raw: json,
      };
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        this.logger.warn('Getnet order creation timed out');
        throw new Error('Getnet order creation timeout');
      }
      throw e;
    }
  }

  async getOrderStatus(providerOrderUuid: string): Promise<GetnetOrderStatusResponse> {
    const config = loadGetnetConfig();
    if (!config.enabled) {
      throw new Error('Getnet is not configured');
    }

    const token = await this.auth.getAccessToken();
    const url = `${config.checkoutBaseUrl.replace(/\/$/, '')}/api/v2/orders/${encodeURIComponent(providerOrderUuid)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const json = (await res.json()) as {
        data?: {
          attributes?: {
            status?: string;
            payment_status?: string;
          };
        };
        errors?: Array<{ detail?: string }>;
      };

      if (!res.ok) {
        const errDetail = json.errors?.[0]?.detail ?? `HTTP ${res.status}`;
        this.logger.warn(`Getnet order status fetch failed: ${errDetail}`);
        throw new Error(`Getnet status fetch failed: ${errDetail}`);
      }

      const attrs = json.data?.attributes ?? {};
      const status = (
        attrs.status ??
        attrs.payment_status ??
        'unknown'
      ) as GetnetRemoteStatus;

      return {
        uuid: providerOrderUuid,
        status,
        paymentStatus: attrs.payment_status,
        raw: json,
      };
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        this.logger.warn('Getnet order status fetch timed out');
        throw new Error('Getnet status fetch timeout');
      }
      throw e;
    }
  }
}
