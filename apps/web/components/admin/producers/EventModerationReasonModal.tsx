'use client';

import { useState } from 'react';
import { Button, Input } from '@/components';

type EventModerationReasonModalProps = {
  open: boolean;
  title: string;
  confirmLabel: string;
  showNewDate?: boolean;
  onClose: () => void;
  onConfirm: (reason: string, newStartAt?: string) => void;
  isPending?: boolean;
};

export function EventModerationReasonModal({
  open,
  title,
  confirmLabel,
  showNewDate,
  onClose,
  onConfirm,
  isPending,
}: EventModerationReasonModalProps) {
  const [reason, setReason] = useState('');
  const [newStartAt, setNewStartAt] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason.trim(), showNewDate && newStartAt ? newStartAt : undefined);
    setReason('');
    setNewStartAt('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-bg p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Motivo</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              className="w-full rounded border border-border bg-bg-muted px-3 py-2 text-text"
              placeholder="Describí el motivo…"
            />
          </div>
          {showNewDate && (
            <Input
              label="Nueva fecha (opcional)"
              type="datetime-local"
              value={newStartAt}
              onChange={(e) => setNewStartAt(e.target.value)}
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !reason.trim()}>
              {isPending ? 'Guardando…' : confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
