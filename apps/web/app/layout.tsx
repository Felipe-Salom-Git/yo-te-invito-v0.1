import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from './providers';
import { Navbar, Footer } from '@/components';

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
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
