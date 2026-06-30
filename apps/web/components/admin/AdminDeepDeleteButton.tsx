'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components';
import { useRepositories } from '@/repositories/context';
import { getErrorMessage } from '@/lib/errors';
import { adminDeepDeleteKeys } from '@/lib/query/keys';
import type { AdminDeepDeleteEntityType } from '@yo-te-invito/shared';
import { AdminDeepDeleteModal } from './AdminDeepDeleteModal';

type Props = {
  entityType: AdminDeepDeleteEntityType;
  entityId: string;
  entityLabel: string;
  onSuccess?: () => void;
  buttonLabel?: string;
  compact?: boolean;
  className?: string;
};

export function AdminDeepDeleteButton({
  entityType,
  entityId,
  entityLabel,
  onSuccess,
  buttonLabel = 'Eliminación profunda',
  compact,
  className,
}: Props) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const preflightQuery = useQuery({
    queryKey: adminDeepDeleteKeys.preflight(entityType, entityId),
    queryFn: () => repos.adminDeepDelete.getPreflight(entityType, entityId),
    enabled: open && !!entityId,
  });

  const deleteMutation = useMutation({
    mutationFn: (body: {
      force: boolean;
      confirmationText: string;
      acknowledgedCriticalHistory: boolean;
    }) => repos.adminDeepDelete.execute(entityType, entityId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminDeepDeleteKeys.all });
      setOpen(false);
      setDeleteError(null);
      onSuccess?.();
    },
    onError: (err) => setDeleteError(getErrorMessage(err)),
  });

  return (
    <>
      <Button
        type="button"
        size={compact ? 'sm' : undefined}
        variant="outline"
        className={className ?? 'border-red-800/60 text-red-400'}
        onClick={() => {
          setDeleteError(null);
          setOpen(true);
        }}
        disabled={deleteMutation.isPending}
      >
        {buttonLabel}
      </Button>
      <AdminDeepDeleteModal
        open={open}
        entityLabel={entityLabel}
        preflight={preflightQuery.data ?? null}
        isPreflightLoading={preflightQuery.isLoading}
        isDeleting={deleteMutation.isPending}
        deleteError={deleteError}
        onClose={() => {
          setOpen(false);
          setDeleteError(null);
        }}
        onConfirm={(payload) => deleteMutation.mutate(payload)}
      />
    </>
  );
}
