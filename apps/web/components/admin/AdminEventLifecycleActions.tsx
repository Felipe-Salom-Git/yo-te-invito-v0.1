'use client';

import { useState } from 'react';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  usePauseAdminEventMutation,
  useRestoreAdminEventMutation,
  useHardDeleteAdminEventMutation,
} from '@/lib/query/admin-content-lifecycle';
import { AdminArchiveConfirmModal } from './AdminArchiveConfirmModal';
import { AdminHardDeleteConfirmModal } from './AdminHardDeleteConfirmModal';

const ARCHIVE_DESCRIPTION =
  'No borra historial (órdenes, tickets, reseñas ni auditoría). El contenido dejará de aparecer en home, explore, categorías y búsqueda.';

const HARD_DELETE_DESCRIPTION =
  'Elimina la publicación de forma permanente solo si no tiene órdenes, tickets, pagos, escaneos, transferencias ni reseñas.';

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
  const hardDeleteMutation = useHardDeleteAdminEventMutation();
  const [modal, setModal] = useState<'archive' | 'restore' | 'hard-delete' | null>(null);
  const [hardDeleteError, setHardDeleteError] = useState<string | null>(null);

  const pending =
    pauseMutation.isPending || restoreMutation.isPending || hardDeleteMutation.isPending;

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

  const handleHardDelete = (reason?: string) => {
    setHardDeleteError(null);
    hardDeleteMutation.mutate(
      { eventId, reason },
      {
        onSuccess: () => {
          addToast('Publicación eliminada definitivamente', 'success');
          setModal(null);
          onSuccess?.();
        },
        onError: (err) => {
          const msg = getErrorMessage(err);
          setHardDeleteError(msg);
          if (!msg.includes('historial operativo')) {
            addToast(msg, 'error');
          }
        },
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'approved' && (
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
      )}

      {status === 'paused' && (
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
      )}

      <Button
        type="button"
        size={compact ? 'sm' : 'md'}
        variant="outline"
        className="border-red-800/60 text-red-400 hover:border-red-600 hover:text-red-300"
        onClick={() => {
          setHardDeleteError(null);
          setModal('hard-delete');
        }}
        disabled={pending}
      >
        Eliminar definitivamente
      </Button>

      <AdminHardDeleteConfirmModal
        open={modal === 'hard-delete'}
        title="Eliminar publicación definitivamente"
        description={HARD_DELETE_DESCRIPTION}
        onClose={() => {
          setModal(null);
          setHardDeleteError(null);
        }}
        onConfirm={handleHardDelete}
        isPending={hardDeleteMutation.isPending}
        errorMessage={hardDeleteError}
      />
    </div>
  );
}
