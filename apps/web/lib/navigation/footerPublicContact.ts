import type { PublicPlatformConfig } from '@/repositories/interfaces';

export const FOOTER_CONTACT_DEFAULT = {
  email: 'soporte@yoteinvito.club',
  phone: '+54 2944 923544',
} as const;

export type FooterContactDisplay = {
  email: string;
  phone: string;
  phoneTel: string;
  whatsappUrl: string;
  address: string;
};

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

function toTelHref(phone: string): string {
  const digits = digitsOnly(phone);
  return digits ? `tel:+${digits}` : '';
}

function toWhatsAppHref(phone: string): string {
  const digits = digitsOnly(phone);
  return digits ? `https://wa.me/${digits}` : '';
}

/**
 * Resolves footer contact from public API config with real frontend fallbacks.
 */
export function resolveFooterContact(
  config: PublicPlatformConfig | undefined,
): FooterContactDisplay {
  const email = config?.supportEmail?.trim() || FOOTER_CONTACT_DEFAULT.email;
  const phone = config?.supportPhone?.trim() || FOOTER_CONTACT_DEFAULT.phone;
  const address = config?.address?.trim() ?? '';

  return {
    email,
    phone,
    phoneTel: toTelHref(phone),
    whatsappUrl: toWhatsAppHref(phone),
    address,
  };
}
