'use client';

import Link from 'next/link';
import { PageContainer, SectionTitle, Card, CardContent } from '@/components';

export default function SeedDevPage() {
  return (
    <PageContainer>
      <SectionTitle>Poblar datos demo</SectionTitle>
      <p className="mt-2 text-sm text-text-muted">
        La app usa la API como fuente de datos. Ejecutá los seeds en la API desde la raíz del repo.
      </p>

      <Card className="mt-6">
        <CardContent>
          <h3 className="text-sm font-semibold text-text">1. Seed base (obligatorio)</h3>
          <code className="mt-2 block rounded bg-bg-muted p-4 font-mono text-sm text-text">
            cd apps/api &amp;&amp; pnpm run demo:seed
          </code>
          <p className="mt-3 text-sm text-text-muted">
            Crea tenant demo, usuarios (admin@demo.local, producer@demo.local, etc.) y un evento básico.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-4 border-accent/30">
        <CardContent>
          <h3 className="text-sm font-semibold text-accent">2. Curated demo (opcional)</h3>
          <p className="mt-1 text-xs text-text-muted">Contenido editorial para evaluar landing, rails y detalle</p>
          <code className="mt-2 block rounded bg-bg-muted p-4 font-mono text-sm text-text">
            cd apps/api &amp;&amp; pnpm run demo:seed-curated
          </code>
          <p className="mt-3 text-sm text-text-muted">
            Agrega ~28 entradas: eventos (música, comedy, ferias), gastronomía (restaurantes, cafés), excursiones
            (trekking, navegación, vino) y rentals (bicis, kayaks, cabañas). Requiere demo:seed previo.
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Útil para testear homepage rails, cards expandibles y variedad de categorías.
          </p>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-text-muted">
        Migración: correr <code className="rounded bg-bg-muted px-1">pnpm prisma-migrate</code> en apps/api antes del curated seed.
      </p>

      <div className="mt-6 flex gap-4">
        <Link href="/home" className="text-sm text-accent hover:underline">
          Ir al Home
        </Link>
        <Link href="/dev/scanner-sim" className="text-sm text-accent hover:underline">
          Scanner sim
        </Link>
      </div>
    </PageContainer>
  );
}
