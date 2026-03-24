'use client';

import type { ProfileStatus } from '@/lib/account/profile-status';

interface ProfileStatusBadgeProps {
  status: ProfileStatus;
  className?: string;
}

const LABELS: Record<ProfileStatus, string> = {
  available: 'Disponible',
  pending: 'Pendiente de aprobación',
  unavailable: 'No disponible',
};

const STYLES: Record<ProfileStatus, string> = {
  available:
    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  pending:
    'bg-amber-500/20 text-amber-300 border-amber-500/40',
  unavailable:
    'bg-border/50 text-text-muted border-border',
};

export function ProfileStatusBadge({ status, className = '' }: ProfileStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]} ${className}`}
      aria-label={`Estado: ${LABELS[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
