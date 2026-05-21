'use client';

import { Button, useToast } from '@/components';
import { usePatchTicketReminder } from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  ticketId: string;
  reminderEnabled: boolean;
  disabled?: boolean;
};

export function TicketReminderToggle({ ticketId, reminderEnabled, disabled }: Props) {
  const { addToast } = useToast();
  const patch = usePatchTicketReminder(ticketId);

  const toggle = () => {
    patch.mutate(
      { enabled: !reminderEnabled },
      {
        onSuccess: () =>
          addToast(
            reminderEnabled ? 'Recordatorio desactivado para este ticket' : 'Recordatorio activado',
            'success',
          ),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-medium text-text">Recordatorio 24 h antes</p>
        <p className="text-xs text-text-muted">
          {reminderEnabled ? 'Activo para este ticket' : 'Desactivado para este ticket'}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || patch.isPending}
        onClick={toggle}
      >
        {patch.isPending ? '…' : reminderEnabled ? 'Desactivar' : 'Activar'}
      </Button>
    </div>
  );
}
