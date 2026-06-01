import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Yo Te Invito',
  description:
    'Descubrí eventos, experiencias, propuestas gastronómicas, hoteles y servicios para vivir tu ciudad.',
  alternates: {
    canonical: '/home',
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

