/**
 * Public footer content config.
 */

export type FooterSocialLink = {
  id: string;
  label: string;
  href: string | null;
  placeholder: boolean;
};

export const FOOTER_INSTAGRAM = {
  href: 'https://www.instagram.com/yo.te.invito/',
  handle: '@yo.te.invito',
  title: 'Seguinos en Instagram',
  ctaLabel: 'Ver perfil',
} as const;

export const FOOTER_SOCIAL_LINKS: FooterSocialLink[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    href: FOOTER_INSTAGRAM.href,
    placeholder: false,
  },
];

export const FOOTER_DEVELOPER_CREDIT = {
  name: 'Felipe Salom',
  phone: '+54 2944 927137',
  phoneTel: '+542944927137',
} as const;

/** Institutional copy — footer público (alineado al mockup). */
export const FOOTER_INSTITUTIONAL_COPY =
  'Conectamos personas con eventos, experiencias, gastronomía, excursiones, rentals y propuestas turísticas en un solo lugar.';
