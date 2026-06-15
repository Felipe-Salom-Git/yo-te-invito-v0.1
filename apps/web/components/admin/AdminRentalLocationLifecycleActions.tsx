'use client';

import { useState } from 'react';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { useRentalLocationLifecycleMutation, useHardDeleteRentalLocationMutation } from '@/lib/query/admin-content-lifecycle';
import { AdminArchiveConfirmModal } from './AdminArchiveConfirmModal';
import { AdminHardDeleteConfirmModal } from './AdminHardDeleteConfirmModal';

const DEACTIVATE_DESCRIPTION =
  'No borra productos ni historial. El local y sus productos dejarán de aparecer en descubrimiento público.';

type AdminRentalLocationLifecycleActionsProps = {
  locationId: string;
  isActive: boolean;
  onHardDeleted?: () => void;
};

export function AdminRentalLocationLifecycleActions({
  locationId,
  isActive,
  onHardDeleted,
}: AdminRentalLocationLifecycleActionsProps) {
  const { addToast } = useToast();
  const mutation = useRentalLocationLifecycleMutation();
  const hardDeleteMutation = useHardDeleteRentalLocationMutation();
  const [modal, setModal] = useState<'deactivate' | 'activate' | 'hard-delete' | null>(null);
  const [hardDeleteError, setHardDeleteError] = useState<string | null>(null);

  const run = (action: 'deactivate' | 'activate', reason?: string) => {
    mutation.mutate(
      { locationId, action, reason },
      {
        onSuccess: () => {
          addToast(action === 'deactivate' ? 'Local dado de baja' : 'Local reactivado', 'success');
          setModal(null);
        },
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {isActive ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setModal('deactivate')}
          disabled={mutation.isPending}
        >
          Dar de baja
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setModal('activate')}
          disabled={mutation.isPending}
        >
          Reactivar local
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-red-800/60 text-red-400"
        onClick={() => {
          setHardDeleteError(null);
          setModal('hard-delete');
        }}
        disabled={mutation.isPending || hardDeleteMutation.isPending}
      >
        Eliminar definitivamente
      </Button>
      <AdminArchiveConfirmModal
        open={modal === 'deactivate'}
        title="Dar de baja local rental"
        description={DEACTIVATE_DESCRIPTION}
        confirmLabel="Dar de baja"
        onClose={() => setModal(null)}
        onConfirm={(reason) => run('deactivate', reason)}
        isPending={mutation.isPending}
      />
      <AdminArchiveConfirmModal
        open={modal === 'activate'}
        title="Reactivar local rental"
        description="El local volverá a estar activo. Los productos publicados reaparecerán si siguen en estado aprobado."
        confirmLabel="Reactivar"
        onClose={() => setModal(null)}
        onConfirm={(reason) => run('activate', reason)}
        isPending={mutation.isPending}
      />
      <AdminHardDeleteConfirmModal
        open={modal === 'hard-delete'}
        title="Eliminar local rental definitivamente"
        description="Borra el local y sus productos sin historial transaccional. Irreversible."
        onClose={() => {
          setModal(null);
          setHardDeleteError(null);
        }}
        onConfirm={(reason) => {
          setHardDeleteError(null);
          hardDeleteMutation.mutate(
            { locationId, reason },
            {
              onSuccess: () => {
                addToast('Local eliminado definitivamente', 'success');
                setModal(null);
                onHardDeleted?.();
              },
              onError: (err) => setHardDeleteError(getErrorMessage(err)),
            },
          );
        }}
        isPending={hardDeleteMutation.isPending}
        errorMessage={hardDeleteError}
      />
    </div>
  );
}
