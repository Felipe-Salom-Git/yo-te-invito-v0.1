'use client';

import { useState } from 'react';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  useExcursionOperatorLifecycleMutation,
  useHardDeleteExcursionOperatorMutation,
} from '@/lib/query/admin-content-lifecycle';
import { AdminArchiveConfirmModal } from './AdminArchiveConfirmModal';
import { AdminHardDeleteConfirmModal } from './AdminHardDeleteConfirmModal';

const DEACTIVATE_DESCRIPTION =
  'No borra excursiones ni historial. El operador y sus excursiones publicadas dejarán de aparecer en descubrimiento público.';

type AdminExcursionOperatorLifecycleActionsProps = {
  operatorId: string;
  isActive: boolean;
  onHardDeleted?: () => void;
};

export function AdminExcursionOperatorLifecycleActions({
  operatorId,
  isActive,
  onHardDeleted,
}: AdminExcursionOperatorLifecycleActionsProps) {
  const { addToast } = useToast();
  const mutation = useExcursionOperatorLifecycleMutation();
  const hardDeleteMutation = useHardDeleteExcursionOperatorMutation();
  const [modal, setModal] = useState<'deactivate' | 'activate' | 'hard-delete' | null>(null);
  const [hardDeleteError, setHardDeleteError] = useState<string | null>(null);

  const run = (action: 'deactivate' | 'activate', reason?: string) => {
    mutation.mutate(
      { operatorId, action, reason },
      {
        onSuccess: () => {
          addToast(
            action === 'deactivate' ? 'Operador dado de baja' : 'Operador reactivado',
            'success',
          );
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
          disabled={mutation.isPending || hardDeleteMutation.isPending}
        >
          Dar de baja
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setModal('activate')}
          disabled={mutation.isPending || hardDeleteMutation.isPending}
        >
          Reactivar operador
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
        title="Dar de baja operador de excursión"
        description={DEACTIVATE_DESCRIPTION}
        confirmLabel="Dar de baja"
        onClose={() => setModal(null)}
        onConfirm={(reason) => run('deactivate', reason)}
        isPending={mutation.isPending}
      />
      <AdminArchiveConfirmModal
        open={modal === 'activate'}
        title="Reactivar operador de excursión"
        description="El operador volverá a estar activo. Las excursiones publicadas reaparecerán si siguen aprobadas."
        confirmLabel="Reactivar"
        onClose={() => setModal(null)}
        onConfirm={(reason) => run('activate', reason)}
        isPending={mutation.isPending}
      />
      <AdminHardDeleteConfirmModal
        open={modal === 'hard-delete'}
        title="Eliminar operador definitivamente"
        description="Borra el operador y sus excursiones sin historial transaccional. Irreversible."
        onClose={() => {
          setModal(null);
          setHardDeleteError(null);
        }}
        onConfirm={(reason) => {
          setHardDeleteError(null);
          hardDeleteMutation.mutate(
            { operatorId, reason },
            {
              onSuccess: () => {
                addToast('Operador eliminado definitivamente', 'success');
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
