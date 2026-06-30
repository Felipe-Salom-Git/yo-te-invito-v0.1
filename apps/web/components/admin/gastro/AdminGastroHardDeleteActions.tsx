'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '@/components';
import { AdminDeepDeleteButton } from '@/components/admin/AdminDeepDeleteButton';

type Props = {
  profileId: string;
  displayName: string;
};

export function AdminGastroHardDeleteActions({ profileId, displayName }: Props) {
  const router = useRouter();
  const { addToast } = useToast();

  return (
    <AdminDeepDeleteButton
      entityType="GASTRO"
      entityId={profileId}
      entityLabel={displayName}
      buttonLabel="Eliminar definitivamente"
      compact
      onSuccess={() => {
        addToast('Local gastronómico eliminado', 'success');
        router.push('/admin/gastronomicos');
      }}
    />
  );
}
