'use client';

import { useState } from 'react';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  usePauseAdminEventMutation,
  useRestoreAdminEventMutation,
} from '@/lib/query/admin-content-lifecycle';
import { AdminArchiveConfirmModal } from './AdminArchiveConfirmModal';
import { AdminDeepDeleteButton } from './AdminDeepDeleteButton';

const ARCHIVE_DESCRIPTION =
  'No borra historial (órdenes, tickets, reseñas ni auditoría). El contenido dejará de aparecer en home, explore, categorías y búsqueda.';

type AdminEventLifecycleActionsProps = {
  eventId: string;
  eventTitle?: string;
  status: string;
  compact?: boolean;
  onSuccess?: () => void;
};

export function AdminEventLifecycleActions({
  eventId,
  eventTitle,
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

      <AdminDeepDeleteButton
        entityType="EVENT"
        entityId={eventId}
        entityLabel={eventTitle ?? eventId}
        buttonLabel="Eliminación profunda"
        compact={compact}
        onSuccess={() => {
          addToast('Publicación eliminada', 'success');
          onSuccess?.();
        }}
      />
    </div>
  );
}
