'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components';

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'danger' | 'primary';
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function AdminReviewDisputeConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  variant = 'primary',
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Modal
      isOpen={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            variant={variant === 'danger' ? 'outline' : undefined}
            className={variant === 'danger' ? 'border-red-500/50 text-red-300 hover:bg-red-500/10' : ''}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-text-muted">{description}</p>
    </Modal>
  );
}
