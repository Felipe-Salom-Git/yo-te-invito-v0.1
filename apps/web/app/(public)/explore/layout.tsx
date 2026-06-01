import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explorar',
  description:
    'Explorá eventos, excursiones, gastronomía, hoteles y servicios disponibles en Yo Te Invito.',
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
