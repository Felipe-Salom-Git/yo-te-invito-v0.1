import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Baja de emails promocionales',
  robots: { index: false, follow: false },
};

export default function BajaPromosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
