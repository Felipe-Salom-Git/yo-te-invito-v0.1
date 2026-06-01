import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Yo Te Invito',
  description:
    'Descubrí eventos, experiencias, propuestas gastronómicas, hoteles y servicios para vivir tu ciudad.',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
