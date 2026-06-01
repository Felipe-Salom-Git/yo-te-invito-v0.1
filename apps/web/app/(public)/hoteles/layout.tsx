import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hoteles (Próximamente)',
  description:
    'Hoteles y alojamientos estarán disponibles próximamente en Yo Te Invito.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/hoteles',
  },
};

export default function HotelsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

