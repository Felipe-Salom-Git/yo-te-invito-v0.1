'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { EventModerationReasonModal } from '@/components/admin/producers/EventModerationReasonModal';

type Props = {
  eventId: string;
  status: string;
};

/** G12.2 — Approve / reject a gastro promo event (generic admin event moderation). */
export function AdminGastroPromoEventModeration({ eventId, status }: Props) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin'] });

  const approve = useMutation({
    mutationFn: () => repos.adminEvents.approve(eventId),
    onSuccess: () => {
      addToast('Evento aprobado y publicado', 'success');
      invalidate();
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });
  const reject = useMutation({
    mutationFn: (reason: string) => repos.adminEvents.reject(eventId, reason),
    onSuccess: () => {
      addToast('Evento rechazado', 'success');
      setRejectOpen(false);
      invalidate();
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  if (status !== 'pending') return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending || reject.isPending}>
        Aprobar
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setRejectOpen(true)}
        disabled={approve.isPending || reject.isPending}
      >
        Rechazar
      </Button>
      <EventModerationReasonModal
        open={rejectOpen}
        title="Rechazar evento del local"
        confirmLabel="Rechazar"
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => reject.mutate(reason)}
        isPending={reject.isPending}
      />
    </div>
  );
}
