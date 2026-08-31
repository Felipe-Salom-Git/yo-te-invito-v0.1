import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components';
import { RouteAwareFooter } from '@/components/RouteAwareFooter';
import { SiteOrganizationJsonLd } from '@/components/seo/SiteOrganizationJsonLd';
import { BRAND_FAVICON_SIZE, BRAND_FAVICON_SRC, OG_SHARE_METADATA } from '@/lib/seo/brandAssets';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yoteinvito.club';
const SITE_DESCRIPTION =
  'Eventos, gastronomía, actividades y rentals. Comprá entradas y descubrí experiencias en tu ciudad.';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: 'Yo Te Invito', template: '%s | Yo Te Invito' },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Yo Te Invito',
    url: '/',
    title: 'Yo Te Invito',
    description: SITE_DESCRIPTION,
    images: [OG_SHARE_METADATA],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yo Te Invito',
    description: SITE_DESCRIPTION,
    images: [OG_SHARE_METADATA.url],
  },
  icons: {
    icon: [{ url: BRAND_FAVICON_SRC, type: 'image/png', sizes: BRAND_FAVICON_SIZE }],
    shortcut: BRAND_FAVICON_SRC,
    apple: [{ url: BRAND_FAVICON_SRC, type: 'image/png', sizes: BRAND_FAVICON_SIZE }],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <SiteOrganizationJsonLd />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;d.classList.add('dark');d.removeAttribute('data-theme');if(localStorage.getItem('yti:theme')==='light')localStorage.removeItem('yti:theme');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-bg text-text antialiased">
        <Providers>
          <Navbar />
          <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
          <RouteAwareFooter />
        </Providers>
      </body>
    </html>
  );
}
