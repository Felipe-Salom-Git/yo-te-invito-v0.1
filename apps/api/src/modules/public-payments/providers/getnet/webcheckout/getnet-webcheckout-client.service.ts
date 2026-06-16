import { Injectable, Logger } from '@nestjs/common';
import { GetnetWebCheckoutAuthService } from './getnet-webcheckout-auth.service';
import {
  buildWebCheckoutPaymentIntentUrl,
  loadGetnetWebCheckoutConfig,
} from './getnet-webcheckout.config';
import type {
  CreateWebCheckoutPaymentIntentInput,
  CreateWebCheckoutPaymentIntentResult,
} from './getnet-webcheckout.types';

function sanitizeResponseForMetadata(
  json: Record<string, unknown>,
): Record<string, unknown> {
  const deny = new Set([
    'access_token',
    'client_secret',
    'secret',
    'token',
    'authorization',
  ]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(json)) {
    if (deny.has(key.toLowerCase())) {
      out[key] = '[redacted]';
    } else if (typeof value === 'object' && value !== null) {
      out[key] = sanitizeResponseForMetadata(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function extractPaymentIntentFields(json: Record<string, unknown>): {
  paymentIntentId?: string;
  redirectUrl?: string;
} {
  const paymentIntentId =
    (typeof json.payment_intent_id === 'string' && json.payment_intent_id) ||
    (typeof json.paymentIntentId === 'string' && json.paymentIntentId) ||
    (typeof json.id === 'string' && json.id) ||
    undefined;

  const redirectUrl =
    (typeof json.redirect_url === 'string' && json.redirect_url) ||
    (typeof json.redirectUrl === 'string' && json.redirectUrl) ||
    (typeof json.checkout_url === 'string' && json.checkout_url) ||
    (typeof json.checkoutUrl === 'string' && json.checkoutUrl) ||
    undefined;

  return { paymentIntentId, redirectUrl };
}

@Injectable()
export class GetnetWebCheckoutClientService {
  private readonly logger = new Logger(GetnetWebCheckoutClientService.name);

  constructor(private readonly auth: GetnetWebCheckoutAuthService) {}

  async createPaymentIntent(
    input: CreateWebCheckoutPaymentIntentInput,
  ): Promise<CreateWebCheckoutPaymentIntentResult> {
    const config = loadGetnetWebCheckoutConfig();
    if (!config.enabled) {
      throw new Error('Getnet Web Checkout is not configured');
    }

    const endpoint = buildWebCheckoutPaymentIntentUrl(config);
    const accessToken = await this.auth.getAccessToken();

    const payload = {
      order_id: input.orderId,
      payment: {
        currency: input.currency,
        amount: input.amountMinor,
      },
      product: input.products.map((p) => ({
        product_type: p.productType,
        title: p.title,
        description: p.description,
        value: p.valueMinor,
        quantity: p.quantity,
      })),
      customer: {
        customer_id: input.customer.customerId,
        first_name: input.customer.firstName,
        last_name: input.customer.lastName,
        name: input.customer.name,
        email: input.customer.email,
        document_type: 'DNI',
        document_number: input.customer.documentNumber,
        checked_email: true,
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'x-seller-id': config.sellerId,
    };
    if (config.merchantId) {
      headers['x-merchant-id'] = config.merchantId;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const text = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        throw new Error(
          `Getnet Web Checkout payment-intent non-JSON response (${res.status})`,
        );
      }

      if (!res.ok) {
        const message =
          (typeof json.message === 'string' && json.message) ||
          (typeof json.error_description === 'string' &&
            json.error_description) ||
          `HTTP ${res.status}`;
        this.logger.warn(
          `Web Checkout payment-intent failed status=${res.status} message=${message}`,
        );
        throw new Error(`Getnet Web Checkout payment-intent failed: ${message}`);
      }

      const { paymentIntentId, redirectUrl } = extractPaymentIntentFields(json);
      if (!paymentIntentId) {
        throw new Error(
          'Getnet Web Checkout response missing payment_intent_id',
        );
      }
      if (!redirectUrl) {
        throw new Error(
          'Getnet Web Checkout response missing redirect_url (required for V1 Redirect flow)',
        );
      }

      return {
        paymentIntentId,
        redirectUrl,
        raw: sanitizeResponseForMetadata(json),
      };
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Getnet Web Checkout payment-intent timeout');
      }
      throw e;
    }
  }
}
