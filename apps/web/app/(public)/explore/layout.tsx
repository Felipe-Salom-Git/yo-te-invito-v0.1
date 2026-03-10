import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explorar eventos',
  description: 'Busca eventos, gastronomía, excursiones y alquileres',
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
