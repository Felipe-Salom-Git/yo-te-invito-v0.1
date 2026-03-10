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

  return (
    <PageContainer>
      <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <SectionTitle>Resumen de descuentos</SectionTitle>
      <p className="mt-2 text-text-muted">
        Historial de cantidad de gente que consumió descuentos cargados en la web.
      </p>

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
