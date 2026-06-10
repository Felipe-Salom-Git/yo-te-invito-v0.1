import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components';
import { RouteAwareFooter } from '@/components/RouteAwareFooter';
import { SiteOrganizationJsonLd } from '@/components/seo/SiteOrganizationJsonLd';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yoteinvito.club';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: 'Yo Te Invito', template: '%s | Yo Te Invito' },
  description: 'Eventos, gastronomía, excursiones y rentals. Comprá entradas y descubrí experiencias en tu ciudad.',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Yo Te Invito',
    url: '/',
    title: 'Yo Te Invito',
    description: 'Eventos, gastronomía, excursiones y rentals. Comprá entradas y descubrí experiencias en tu ciudad.',
    images: [
      {
        url: '/brand/logo_2.png',
        width: 1884,
        height: 1550,
        alt: 'Yo Te Invito',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yo Te Invito',
    description: 'Eventos, gastronomía, excursiones y rentals. Comprá entradas y descubrí experiencias en tu ciudad.',
    images: ['/brand/logo_2.png'],
  },
  icons: {
    icon: [{ url: '/brand/logo.png', type: 'image/png' }],
    apple: [{ url: '/brand/logo.png', type: 'image/png' }],
    shortcut: '/brand/logo.png',
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
