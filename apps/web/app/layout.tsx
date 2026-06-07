import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components';
import { RouteAwareFooter } from '@/components/RouteAwareFooter';

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
    icon: '/brand/logo.png',
    apple: '/brand/logo.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('yti:theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();`,
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
