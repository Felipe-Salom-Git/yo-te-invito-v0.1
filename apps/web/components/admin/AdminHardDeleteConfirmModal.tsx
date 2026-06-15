'use client';

import { useState } from 'react';
import { Button } from '@/components';

const CONFIRM_WORD = 'ELIMINAR';

type AdminHardDeleteConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  isPending?: boolean;
  errorMessage?: string | null;
};

export function AdminHardDeleteConfirmModal({
  open,
  title,
  description,
  onClose,
  onConfirm,
  isPending,
  errorMessage,
}: AdminHardDeleteConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');

  if (!open) return null;

  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    onConfirm(reason.trim() || undefined);
    setConfirmText('');
    setReason('');
  };

  const handleClose = () => {
    setConfirmText('');
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-red-900/50 bg-bg p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        <p className="mt-2 text-sm text-text-muted">{description}</p>
        <p className="mt-3 text-sm font-medium text-red-400">
          Esta acción es irreversible. No se puede deshacer.
        </p>
        {errorMessage && (
          <p className="mt-3 rounded-lg border border-amber-800/50 bg-amber-900/20 px-3 py-2 text-sm text-amber-200">
            {errorMessage}
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">
              Escribí {CONFIRM_WORD} para confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              className="w-full rounded border border-border bg-bg-muted px-3 py-2 text-text"
              placeholder={CONFIRM_WORD}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">
              Motivo (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full rounded border border-border bg-bg-muted px-3 py-2 text-text"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-red-700 text-white hover:bg-red-600"
              disabled={isPending || !canConfirm}
            >
              Eliminar definitivamente
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
