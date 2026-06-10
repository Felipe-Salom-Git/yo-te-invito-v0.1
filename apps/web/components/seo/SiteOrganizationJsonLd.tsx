const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yoteinvito.club';

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Yo Te Invito',
  url: APP_URL,
  logo: `${APP_URL.replace(/\/$/, '')}/brand/logo.png`,
  description:
    'Eventos, gastronomía, excursiones y rentals. Comprá entradas y descubrí experiencias en tu ciudad.',
};

export function SiteOrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
    />
  );
}
