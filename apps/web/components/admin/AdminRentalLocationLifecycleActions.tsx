'use client';

import { useState } from 'react';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { useRentalLocationLifecycleMutation } from '@/lib/query/admin-content-lifecycle';
import { AdminArchiveConfirmModal } from './AdminArchiveConfirmModal';

const DEACTIVATE_DESCRIPTION =
  'No borra productos ni historial. El local y sus productos dejarán de aparecer en descubrimiento público.';

type AdminRentalLocationLifecycleActionsProps = {
  locationId: string;
  isActive: boolean;
};

export function AdminRentalLocationLifecycleActions({
  locationId,
  isActive,
}: AdminRentalLocationLifecycleActionsProps) {
  const { addToast } = useToast();
  const mutation = useRentalLocationLifecycleMutation();
  const [modal, setModal] = useState<'deactivate' | 'activate' | null>(null);

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
    <>
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
    </>
  );
}
