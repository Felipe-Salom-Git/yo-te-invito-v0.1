/** Getnet Web Checkout `customer` block (production contract). */
export type WebCheckoutCustomerPayload = {
  customer_id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  document_type: 'DNI';
  document_number: string;
  checked_email: boolean;
};

/**
 * Build customer from order. Uses buyerDocument when present.
 * Fallback document_number: `yti-{orderIdSuffix}` — pending dedicated DNI field in checkout UI.
 */
export function buildWebCheckoutCustomer(order: {
  id: string;
  buyerEmail: string;
  buyerFirstName: string;
  buyerLastName: string;
  buyerDocument?: string | null;
}): WebCheckoutCustomerPayload {
  const firstName = order.buyerFirstName?.trim() || 'Comprador';
  const lastName = order.buyerLastName?.trim() || 'YoTeInvito';
  const documentNumber =
    order.buyerDocument?.trim() ||
    `yti-${order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || 'guest'}`;

  return {
    customer_id: documentNumber,
    first_name: firstName,
    last_name: lastName,
    name: `${firstName} ${lastName}`.trim(),
    email: order.buyerEmail.trim(),
    document_type: 'DNI',
    document_number: documentNumber,
    checked_email: true,
  };
}

/** Default smoke amount: 50000 = $500,00 ARS (centavos). */
export const SMOKE_WEBCHECKOUT_AMOUNT_DEFAULT = 50000;

/** Realistic buyer data for `smoke:getnet-webcheckout` (not production orders). */
export const SMOKE_WEBCHECKOUT_CUSTOMER_DEFAULTS = {
  documentNumber: '35123456',
  firstName: 'Smoke',
  lastName: 'Test',
  email: 'smoke@yoteinvito.club',
} as const;

export function buildSmokeWebCheckoutCustomer(overrides?: {
  documentNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}): WebCheckoutCustomerPayload {
  const documentNumber =
    overrides?.documentNumber?.trim() ||
    SMOKE_WEBCHECKOUT_CUSTOMER_DEFAULTS.documentNumber;
  const firstName =
    overrides?.firstName?.trim() || SMOKE_WEBCHECKOUT_CUSTOMER_DEFAULTS.firstName;
  const lastName =
    overrides?.lastName?.trim() || SMOKE_WEBCHECKOUT_CUSTOMER_DEFAULTS.lastName;
  const email =
    overrides?.email?.trim() || SMOKE_WEBCHECKOUT_CUSTOMER_DEFAULTS.email;

  return {
    customer_id: documentNumber,
    first_name: firstName,
    last_name: lastName,
    name: `${firstName} ${lastName}`.trim(),
    email,
    document_type: 'DNI',
    document_number: documentNumber,
    checked_email: true,
  };
}
