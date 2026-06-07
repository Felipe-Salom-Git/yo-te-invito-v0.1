'use client';

import { useState } from 'react';
import { Button } from '@/components';

type AdminArchiveConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  isPending?: boolean;
  requireReason?: boolean;
};

export function AdminArchiveConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  isPending,
  requireReason = false,
}: AdminArchiveConfirmModalProps) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requireReason && !reason.trim()) return;
    onConfirm(reason.trim() || undefined);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-bg p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        <p className="mt-2 text-sm text-text-muted">{description}</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">
              Motivo {requireReason ? '(obligatorio)' : '(opcional)'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required={requireReason}
              className="w-full rounded border border-border bg-bg-muted px-3 py-2 text-text"
              placeholder="Ej. cierre temporal, contenido desactualizado…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
