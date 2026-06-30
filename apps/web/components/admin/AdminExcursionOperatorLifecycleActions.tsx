'use client';

import { useState } from 'react';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { useExcursionOperatorLifecycleMutation } from '@/lib/query/admin-content-lifecycle';
import { AdminArchiveConfirmModal } from './AdminArchiveConfirmModal';
import { AdminDeepDeleteButton } from './AdminDeepDeleteButton';

const DEACTIVATE_DESCRIPTION =
  'No borra excursiones ni historial. El operador y sus excursiones publicadas dejarán de aparecer en descubrimiento público.';

type AdminExcursionOperatorLifecycleActionsProps = {
  operatorId: string;
  operatorName: string;
  isActive: boolean;
  onHardDeleted?: () => void;
};

export function AdminExcursionOperatorLifecycleActions({
  operatorId,
  operatorName,
  isActive,
  onHardDeleted,
}: AdminExcursionOperatorLifecycleActionsProps) {
  const { addToast } = useToast();
  const mutation = useExcursionOperatorLifecycleMutation();
  const [modal, setModal] = useState<'deactivate' | 'activate' | null>(null);

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
          Reactivar operador
        </Button>
      )}
      <AdminDeepDeleteButton
        entityType="EXCURSION_OPERATOR"
        entityId={operatorId}
        entityLabel={operatorName}
        buttonLabel="Eliminación profunda"
        compact
        onSuccess={() => {
          addToast('Operador eliminado', 'success');
          onHardDeleted?.();
        }}
      />
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
    </div>
  );
}
