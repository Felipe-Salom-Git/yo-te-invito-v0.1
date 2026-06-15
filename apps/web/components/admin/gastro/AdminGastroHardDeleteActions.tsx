'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { useHardDeleteGastroProfileMutation } from '@/lib/query/admin-content-lifecycle';
import { AdminHardDeleteConfirmModal } from '@/components/admin/AdminHardDeleteConfirmModal';

type Props = {
  profileId: string;
};

export function AdminGastroHardDeleteActions({ profileId }: Props) {
  const router = useRouter();
  const { addToast } = useToast();
  const mutation = useHardDeleteGastroProfileMutation();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-red-800/60 text-red-400"
        onClick={() => {
          setErrorMessage(null);
          setOpen(true);
        }}
        disabled={mutation.isPending}
      >
        Eliminar definitivamente
      </Button>
      <AdminHardDeleteConfirmModal
        open={open}
        title="Eliminar local gastronómico definitivamente"
        description="Borra el perfil gastro y su evento público si no tienen historial operativo (órdenes, validaciones, reseñas)."
        onClose={() => {
          setOpen(false);
          setErrorMessage(null);
        }}
        onConfirm={(reason) => {
          setErrorMessage(null);
          mutation.mutate(
            { profileId, reason },
            {
              onSuccess: () => {
                addToast('Local gastronómico eliminado', 'success');
                setOpen(false);
                router.push('/admin/gastronomicos');
              },
              onError: (err) => setErrorMessage(getErrorMessage(err)),
            },
          );
        }}
        isPending={mutation.isPending}
        errorMessage={errorMessage}
      />
    </>
  );
}
