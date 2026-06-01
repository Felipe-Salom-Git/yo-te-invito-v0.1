import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Productoras',
  description: 'Descubrí a los mejores organizadores de eventos en Yo Te Invito.',
  alternates: {
    canonical: '/producers',
  },
};

export default function ProducersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

