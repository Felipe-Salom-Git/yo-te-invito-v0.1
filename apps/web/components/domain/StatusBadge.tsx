'use client';

import {
  type TicketStatus,
  type OrderStatus,
  type ScanResult,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_STYLES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  SCAN_RESULT_LABELS,
  SCAN_RESULT_STYLES,
} from '@/lib/domainLabels';

export type StatusBadgeKind = 'ticket' | 'order' | 'scan';

export interface StatusBadgeProps {
  status: string;
  kind: StatusBadgeKind;
  className?: string;
}

function getLabelAndStyle(status: string, kind: StatusBadgeKind): { label: string; style: string } {
  switch (kind) {
    case 'ticket':
      return {
        label: TICKET_STATUS_LABELS[status as TicketStatus] ?? status,
        style: TICKET_STATUS_STYLES[status as TicketStatus] ?? 'bg-border text-text-muted',
      };
    case 'order':
      return {
        label: ORDER_STATUS_LABELS[status as OrderStatus] ?? status,
        style: ORDER_STATUS_STYLES[status as OrderStatus] ?? 'bg-border text-text-muted',
      };
    case 'scan':
      return {
        label: SCAN_RESULT_LABELS[status as ScanResult] ?? status,
        style: SCAN_RESULT_STYLES[status as ScanResult] ?? 'bg-border text-text-muted',
      };
    default:
      return { label: status, style: 'bg-border text-text-muted' };
  }
}

export function StatusBadge({ status, kind, className = '' }: StatusBadgeProps) {
  const { label, style } = getLabelAndStyle(status, kind);
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${style} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
