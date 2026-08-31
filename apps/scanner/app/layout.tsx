import type { Metadata, Viewport } from 'next';
import { SCANNER_APP_NAME, SCANNER_COLORS, SCANNER_TAGLINE, SCANNER_LOGO_SRC } from '@/lib/scanner-brand';
import './globals.css';

export const metadata: Metadata = {
  title: SCANNER_APP_NAME,
  description: SCANNER_TAGLINE,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'YT Scanner',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: SCANNER_LOGO_SRC,
    apple: SCANNER_LOGO_SRC,
  },
};

export const viewport: Viewport = {
  themeColor: SCANNER_COLORS.bg,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-scanner-bg text-white antialiased">{children}</body>
    </html>
  );
}
