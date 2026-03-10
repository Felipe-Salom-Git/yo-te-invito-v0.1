'use client';

import Link from 'next/link';
import { PageContainer, SectionTitle, Card, CardContent } from '@/components';

export default function LocalDBDevPage() {
  return (
    <PageContainer>
      <SectionTitle>Dev tools</SectionTitle>
      <p className="mt-2 text-sm text-text-muted">
        La simulación LocalStorage/LocalDB fue eliminada. La app usa la API como fuente única de datos.
      </p>
      <Card className="mt-6">
        <CardContent>
          <p className="text-sm text-text-muted">
            Para poblar datos: <code className="rounded bg-bg-muted px-2 py-1">cd apps/api &amp;&amp; pnpm run demo:seed</code>
            {' '}(base) y <code className="rounded bg-bg-muted px-2 py-1">pnpm run demo:seed-curated</code>
            {' '}(contenido editorial para landing/rails).
          </p>
        </CardContent>
      </Card>
      <div className="mt-6 flex gap-4">
        <Link href="/dev/seed" className="text-sm text-accent hover:underline">
          Ver instrucciones
        </Link>
        <Link href="/dev/scanner-sim" className="text-sm text-accent hover:underline">
          Scanner sim
        </Link>
      </div>
    </PageContainer>
  );
}
