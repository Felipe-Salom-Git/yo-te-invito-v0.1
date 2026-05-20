'use client';

import type { GastroDiscountStatus } from '@/repositories/interfaces';

const STATUS_LABEL: Record<GastroDiscountStatus, string> = {
  PENDING_REVIEW: 'En revisión',
  COMMISSION_NEGOTIATION: 'Coordinación comisión',
  APPROVED: 'Aprobado',
  ACTIVE: 'Activo',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Vencido',
};

const STATUS_CLASS: Record<GastroDiscountStatus, string> = {
  PENDING_REVIEW: 'bg-amber-500/15 text-amber-300',
  COMMISSION_NEGOTIATION: 'bg-orange-500/15 text-orange-300',
  APPROVED: 'bg-blue-500/15 text-blue-300',
  ACTIVE: 'bg-accent-surface/70 text-accent-soft border border-accent-muted',
  REJECTED: 'bg-red-500/15 text-red-300',
  CANCELLED: 'bg-zinc-500/15 text-zinc-300',
  EXPIRED: 'bg-zinc-500/15 text-zinc-400',
};

export function AdminGastroDiscountStatusBadge({ status }: { status: GastroDiscountStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
