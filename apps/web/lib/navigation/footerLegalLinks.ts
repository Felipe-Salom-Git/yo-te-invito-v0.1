/**
 * Public legal footer links (stable slugs from shared LEGAL_KEY_TO_SLUG).
 * Soporte/contacto comes from PlatformConfig in Footer.
 */

export type FooterLegalLink = {
  href: string;
  label: string;
};

export const FOOTER_LEGAL_LINKS: FooterLegalLink[] = [
  { href: '/legal/terminos', label: 'Términos y condiciones' },
  { href: '/legal/privacidad', label: 'Privacidad' },
  {
    href: '/legal/compras-cancelaciones-reembolsos',
    label: 'Compra, cancelación y reembolso',
  },
  { href: '/legal/transferencia-tickets', label: 'Transferencia de tickets' },
  { href: '/legal/productores', label: 'Productores' },
  { href: '/legal/gastronomicos', label: 'Gastronómicos' },
  { href: '/legal/rentals', label: 'Rentals' },
  { href: '/legal/hoteles', label: 'Hoteles' },
  { href: '/legal/referidos', label: 'Referidos' },
];
