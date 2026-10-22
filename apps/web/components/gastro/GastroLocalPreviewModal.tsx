'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { QueryError } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { gastroKeys } from '@/lib/query/keys';
import { useRepositories } from '@/repositories/context';
import { GastroLocalPreview } from './GastroLocalPreview';
import { GastroLocationStatusBadge } from './GastroLocationStatusBadge';

type Props = {
  /** Local clicked in «Mis locales»; null = closed. */
  profileId: string | null;
  onClose: () => void;
};

export function GastroLocalPreviewModal({ profileId, onClose }: Props) {
  const repos = useRepositories();

  const localQuery = useQuery({
    queryKey: gastroKeys.local(profileId ?? undefined),
    queryFn: () => repos.gastro.getMyLocal(profileId ?? undefined),
    enabled: Boolean(profileId),
  });

  const local = localQuery.data?.id === profileId ? localQuery.data : undefined;
  const subcategoryName =
    local?.subcategories?.find((s) => s.isPrimary)?.name ??
    local?.subcategories?.[0]?.name ??
    null;
  const editHref = profileId
    ? `/gastro/local/editar?profileId=${encodeURIComponent(profileId)}`
    : '/gastro/local/editar';

  return (
    <Modal isOpen={Boolean(profileId)} onClose={onClose} title={local?.displayName ?? 'Ficha del local'} size="3xl">
      {localQuery.isLoading || (!local && !localQuery.isError) ? (
        <p className="text-sm text-text-muted">Cargando ficha…</p>
      ) : localQuery.isError ? (
        <QueryError
          message={getErrorMessage(localQuery.error)}
          onRetry={() => void localQuery.refetch()}
        />
      ) : local && !local.publicEventId ? (
        <div className="space-y-4">
          {local.status ? <GastroLocationStatusBadge status={local.status as 'PENDING'} /> : null}
          <p className="text-sm text-text-muted">
            Este local todavía no tiene ficha pública. Completá nombre, ubicación, horarios,
            imágenes y contacto.
          </p>
          <Link
            href={editHref}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
          >
            Completar local
          </Link>
        </div>
      ) : local ? (
        <GastroLocalPreview local={local} subcategoryName={subcategoryName} />
      ) : null}
    </Modal>
  );
}
