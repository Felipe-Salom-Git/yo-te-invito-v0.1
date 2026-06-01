import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Categorías',
  description:
    'Navegá propuestas por categoría: eventos, gastronomía, excursiones, hoteles, rentals y más.',
};

export default function CategoriasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

