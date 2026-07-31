import type { Metadata } from 'next';

/**
 * Discovery público (home, explore, categorías, fichas) no debe entrar al
 * Full Route Cache anual. Sin esto, Next 15 prerenderiza shells client y
 * sirve `Cache-Control: s-maxage=31536000` + `x-nextjs-prerender: 1`.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  return <div className="min-h-full bg-bg text-text">{children}</div>;
}
