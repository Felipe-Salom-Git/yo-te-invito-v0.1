'use client';

import type { ReviewDisputeDetail } from '@/repositories/interfaces';
import { formatPublicRatingLabel } from '@/lib/reviews/ratingDisplay';
import { AdminReviewDisputeStatusBadge } from './AdminReviewDisputeStatusBadge';
import {
  EVENT_CATEGORY_LABELS,
  REVIEW_DISPUTE_REASON_LABELS,
  formatAdminDateTime,
} from './admin-review-dispute-copy';

type Props = {
  disputes: ReviewDisputeDetail[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function AdminReviewDisputeTable({ disputes, selectedId, onSelect }: Props) {
  return (
    <div className="mt-6 hidden overflow-x-auto md:block">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
            <th className="py-2 pr-3">Productora</th>
            <th className="py-2 pr-3">Entidad</th>
            <th className="py-2 pr-3">Autor</th>
            <th className="py-2 pr-3">Puntaje</th>
            <th className="py-2 pr-3">Motivo</th>
            <th className="py-2 pr-3">Estado</th>
            <th className="py-2">Creada</th>
          </tr>
        </thead>
        <tbody>
          {disputes.map((d) => (
            <tr
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={`cursor-pointer border-b border-border/60 transition-colors hover:bg-bg-muted/50 ${
                selectedId === d.id ? 'bg-accent/10' : ''
              }`}
            >
              <td className="max-w-[140px] truncate py-3 pr-3 text-text">
                {d.producerDisplayName ?? '—'}
              </td>
              <td className="py-3 pr-3">
                <p className="max-w-[180px] truncate font-medium text-text">{d.eventTitle}</p>
                <p className="text-xs text-text-muted">{EVENT_CATEGORY_LABELS[d.eventCategory]}</p>
              </td>
              <td className="max-w-[120px] truncate py-3 pr-3 text-text-muted">
                {d.reviewUserDisplayName}
              </td>
              <td className="py-3 pr-3 font-medium tabular-nums text-accent">
                {formatPublicRatingLabel(d.reviewOverallRating)}
              </td>
              <td className="py-3 pr-3 text-text-muted">
                {REVIEW_DISPUTE_REASON_LABELS[d.reasonType] ?? d.reasonType}
              </td>
              <td className="py-3 pr-3">
                <AdminReviewDisputeStatusBadge status={d.status} />
              </td>
              <td className="whitespace-nowrap py-3 text-xs text-text-muted">
                {formatAdminDateTime(d.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
