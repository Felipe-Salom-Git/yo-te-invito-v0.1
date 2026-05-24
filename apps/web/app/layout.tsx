import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components';
import { RouteAwareFooter } from '@/components/RouteAwareFooter';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: { default: 'Yo Te Invito', template: '%s | Yo Te Invito' },
  description: 'Plataforma de ticketera y venta de entradas para eventos',
  openGraph: { type: 'website', locale: 'es_AR' },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col bg-bg text-text">
        <Providers>
          <Navbar />
          <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
          <RouteAwareFooter />
        </Providers>
      </body>
    </html>
  );
}
