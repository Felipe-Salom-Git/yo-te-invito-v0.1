'use client';

import { useState } from 'react';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  usePauseAdminEventMutation,
  useRestoreAdminEventMutation,
} from '@/lib/query/admin-content-lifecycle';
import { AdminArchiveConfirmModal } from './AdminArchiveConfirmModal';

const ARCHIVE_DESCRIPTION =
  'No borra historial (órdenes, tickets, reseñas ni auditoría). El contenido dejará de aparecer en home, explore, categorías y búsqueda.';

type AdminEventLifecycleActionsProps = {
  eventId: string;
  status: string;
  compact?: boolean;
  onSuccess?: () => void;
};

export function AdminEventLifecycleActions({
  eventId,
  status,
  compact,
  onSuccess,
}: AdminEventLifecycleActionsProps) {
  const { addToast } = useToast();
  const pauseMutation = usePauseAdminEventMutation();
  const restoreMutation = useRestoreAdminEventMutation();
  const [modal, setModal] = useState<'archive' | 'restore' | null>(null);

  const pending = pauseMutation.isPending || restoreMutation.isPending;

  const handleArchive = (reason?: string) => {
    pauseMutation.mutate(
      { eventId, reason },
      {
        onSuccess: () => {
          addToast('Contenido archivado', 'success');
          setModal(null);
          onSuccess?.();
        },
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  const handleRestore = (reason?: string) => {
    restoreMutation.mutate(
      { eventId, reason },
      {
        onSuccess: () => {
          addToast('Contenido restaurado', 'success');
          setModal(null);
          onSuccess?.();
        },
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  if (status === 'approved') {
    return (
      <>
        <Button
          type="button"
          size={compact ? 'sm' : 'md'}
          variant="outline"
          onClick={() => setModal('archive')}
          disabled={pending}
        >
          Archivar
        </Button>
        <AdminArchiveConfirmModal
          open={modal === 'archive'}
          title="Archivar publicación"
          description={ARCHIVE_DESCRIPTION}
          confirmLabel="Archivar"
          onClose={() => setModal(null)}
          onConfirm={handleArchive}
          isPending={pauseMutation.isPending}
        />
      </>
    );
  }

  if (status === 'paused') {
    return (
      <>
        <Button
          type="button"
          size={compact ? 'sm' : 'md'}
          variant="outline"
          onClick={() => setModal('restore')}
          disabled={pending}
        >
          Restaurar
        </Button>
        <AdminArchiveConfirmModal
          open={modal === 'restore'}
          title="Restaurar publicación"
          description="Volverá a estado publicado y podrá aparecer en descubrimiento público si el local/operador asociado está activo."
          confirmLabel="Restaurar"
          onClose={() => setModal(null)}
          onConfirm={handleRestore}
          isPending={restoreMutation.isPending}
        />
      </>
    );
  }

  return null;
}
