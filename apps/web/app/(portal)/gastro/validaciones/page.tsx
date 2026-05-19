'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';

export default function GastroValidacionesPage() {
  const repos = useRepositories();

  const { data: validations = [], isLoading } = useQuery({
    queryKey: ['gastroValidations'],
    queryFn: () => repos.gastro.listValidations(),
  });

  const byDiscount = validations.reduce<Record<string, number>>((acc, v) => {
    acc[v.discountId] = (acc[v.discountId] ?? 0) + 1;
    return acc;
  }, {});
  const summaryRows = Object.entries(byDiscount).sort((a, b) => b[1] - a[1]);

  return (
    <PageContainer>
      <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <SectionTitle>Resumen de descuentos</SectionTitle>
      <p className="mt-2 text-text-muted">
        Historial de cantidad de gente que consumió descuentos cargados en la web.
      </p>

      {!isLoading && validations.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-bg-muted p-4">
          <p className="text-sm font-medium text-text">Resumen por descuento</p>
          <p className="mt-1 text-2xl font-bold text-accent">{validations.length}</p>
          <p className="text-xs text-text-muted">usos registrados en total</p>
          <ul className="mt-3 space-y-1 text-sm text-text-muted">
            {summaryRows.map(([discountId, count]) => (
              <li key={discountId} className="flex justify-between gap-4 border-b border-border/50 py-1 last:border-0">
                <span className="font-mono text-xs text-text">{discountId.slice(0, 12)}…</span>
                <span className="shrink-0 font-medium text-text">{count} uso{count === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {validations.map((v) => (
            <li key={v.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-muted p-4">
              <div>
                <span className="font-medium text-text">Descuento {v.discountId}</span>
                <p className="text-sm text-text-muted">
                  {new Date(v.validatedAt).toLocaleString('es-AR')}
                  {v.orderId && ` · Orden ${v.orderId}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {validations.length === 0 && !isLoading && (
        <p className="mt-6 text-text-muted">Sin validaciones registradas.</p>
      )}
    </PageContainer>
  );
}
