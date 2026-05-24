import type { PublicPlatformConfig } from '@/repositories/interfaces';

/** TODO(producto): reemplazar cuando existan datos reales en PlatformConfig / admin. */
export const FOOTER_CONTACT_PLACEHOLDER = {
  email: 'soporte@yoteinvito.test',
  phone: '+54 9 294 000-0000',
} as const;

export type FooterContactDisplay = {
  email: string;
  phone: string;
  address: string;
  isPlaceholder: boolean;
};

/**
 * Resolves footer contact from public API config with graceful fallback.
 */
export function resolveFooterContact(
  config: PublicPlatformConfig | undefined,
): FooterContactDisplay {
  const email = config?.supportEmail?.trim() ?? '';
  const phone = config?.supportPhone?.trim() ?? '';
  const address = config?.address?.trim() ?? '';

  if (email || phone || address) {
    return { email, phone, address, isPlaceholder: false };
  }

  return {
    email: FOOTER_CONTACT_PLACEHOLDER.email,
    phone: FOOTER_CONTACT_PLACEHOLDER.phone,
    address: '',
    isPlaceholder: true,
  };
}
