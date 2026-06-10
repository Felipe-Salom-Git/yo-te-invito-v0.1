/**
 * Public footer content config — Slice 2 base (UI wiring in later slices).
 * Social / developer URLs are placeholders until product provides real data.
 */

export type FooterNavLink = {
  id: string;
  label: string;
  href: string;
  /** Non-navigable label (e.g. Hoteles Próximamente). */
  comingSoon?: boolean;
  disabled?: boolean;
  /** Only show when user is authenticated (Slice 3+). */
  requiresAuth?: boolean;
};

export type FooterSocialLink = {
  id: string;
  label: string;
  /** null = placeholder — do not render as external link yet. */
  href: string | null;
  placeholder: boolean;
};

export type FooterDeveloperCredit = {
  label: string;
  webUrl: string | null;
  socialUrl: string | null;
  placeholder: boolean;
};

/** Vertical discovery links — align with category gateway / publicNavConfig. */
export const FOOTER_VERTICAL_LINKS: FooterNavLink[] = [
  { id: 'vertical-event', label: 'Eventos', href: '/categoria/event' },
  { id: 'vertical-gastro', label: 'Gastronomía', href: '/categoria/gastro' },
  { id: 'vertical-rental', label: 'Equipos y rentals', href: '/categoria/rental' },
  { id: 'vertical-excursion', label: 'Excursiones', href: '/categoria/excursion' },
  {
    id: 'vertical-hotel',
    label: 'Hoteles',
    href: '/hoteles',
    comingSoon: true,
  },
];

/** Quick access — secondary to navbar; not a duplicate of city/cart/user menu. */
export const FOOTER_QUICK_LINKS: FooterNavLink[] = [
  { id: 'quick-explore', label: 'Explorar', href: '/explore' },
  { id: 'quick-categories', label: 'Categorías', href: '/categorias' },
  { id: 'quick-home', label: 'Inicio', href: '/home' },
  { id: 'quick-portal', label: 'Mi espacio', href: '/me', requiresAuth: true },
  {
    id: 'quick-tickets',
    label: 'Mis tickets',
    href: '/me/tickets',
    requiresAuth: true,
  },
];

/**
 * Trust microcopy — sin prometer pagos reales (checkout demo).
 * Ajustar cuando exista proveedor de pago en producción.
 */
export const FOOTER_TRUST_ITEMS: readonly string[] = [
  'Tickets digitales con QR',
  'Validación QR en el acceso',
  'Resumen antes de confirmar',
  'Soporte y legales publicados',
];

// TODO(producto): reemplazar con Instagram real de Yo Te Invito cuando exista.
export const FOOTER_SOCIAL_LINKS: FooterSocialLink[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    href: null,
    placeholder: true,
  },
  {
    id: 'website',
    label: 'Sitio web',
    href: null,
    placeholder: true,
  },
];

export type FooterDeveloperCreditConfig = FooterDeveloperCredit & {
  teamName: string;
};

// TODO(producto): reemplazar con web/red real del equipo desarrollador cuando exista.
export const FOOTER_DEVELOPER_CREDIT: FooterDeveloperCreditConfig = {
  label: 'Desarrollo web',
  teamName: 'Equipo desarrollador (placeholder)',
  webUrl: null,
  socialUrl: null,
  placeholder: true,
};

/** Institutional copy — premium, cercano; ajustable con marketing. */
export const FOOTER_INSTITUTIONAL_COPY =
  'Yo Te Invito conecta personas con eventos, experiencias, gastronomía, excursiones, rentals y propuestas turísticas en un solo lugar.';
