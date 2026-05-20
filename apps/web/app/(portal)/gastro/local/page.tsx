'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { GastroLocalPreview } from '@/components/gastro/GastroLocalPreview';
import { gastroKeys } from '@/lib/query/keys';

const TENANT_ID = 'tenant-demo';

export default function GastroLocalPage() {
  const repos = useRepositories();
  const { data: local, isLoading } = useQuery({
    queryKey: gastroKeys.local(),
    queryFn: () => repos.gastro.getMyLocal(),
  });

  const { data: subcategories } = useQuery({
    queryKey: ['subcategories', 'gastro', TENANT_ID],
    queryFn: () => repos.subcategories.listPublic(TENANT_ID, 'gastro'),
    enabled: !!local?.subcategoryId,
  });

  const subcategoryName = local?.subcategoryId
    ? subcategories?.find((s) => s.id === local.subcategoryId)?.name
    : null;

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (!local?.publicEventId) {
    return (
      <PageContainer>
        <SectionTitle>Mi local gastronómico</SectionTitle>
        <p className="mb-4 text-text-muted">
          Configurá la ficha pública de tu local: nombre, ubicación, horarios, imágenes y contacto.
        </p>
        <Link
          href="/gastro/local/editar"
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
        >
          Crear local
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SectionTitle>Mi local gastronómico</SectionTitle>
      <p className="mb-6 text-sm text-text-muted">
        Así ven los usuarios tu ficha pública. Los descuentos se gestionan en la sección Descuentos.
      </p>
      <GastroLocalPreview local={local} subcategoryName={subcategoryName} />
    </PageContainer>
  );
}
