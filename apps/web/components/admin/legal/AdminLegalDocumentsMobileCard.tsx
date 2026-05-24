import Link from 'next/link';
import type { AdminLegalDocumentListItem } from '@/repositories/interfaces';
import {
  formatLegalDate,
  legalDocumentKeyLabel,
} from '@/lib/admin/admin-legal-labels';
import { AdminLegalVisibilityBadge } from './AdminLegalVisibilityBadge';
import { AdminLegalVersionStatusBadge } from './AdminLegalVersionStatusBadge';

export function AdminLegalDocumentsMobileCard({ item }: { item: AdminLegalDocumentListItem }) {
  return (
    <article className="rounded-xl border border-border/80 bg-bg-muted/30 p-4 md:hidden">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-text">{item.title}</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            {legalDocumentKeyLabel(item.key)}
          </p>
        </div>
        <AdminLegalVisibilityBadge visibility={item.visibility} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-text-muted">Publicada</dt>
          <dd className="mt-0.5 text-text">
            {item.publishedVersion?.version ?? (
              <span className="text-amber-400">Sin publicar</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Borrador</dt>
          <dd className="mt-0.5">
            {item.draftVersion ? (
              <AdminLegalVersionStatusBadge status="DRAFT" />
            ) : (
              <span className="text-text-muted">—</span>
            )}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-text-muted">Actualizado</dt>
          <dd className="mt-0.5 text-text">{formatLegalDate(item.updatedAt)}</dd>
        </div>
      </dl>
      <Link
        href={`/admin/legales/${item.key}`}
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-accent/40 bg-accent/10 py-2 text-sm font-medium text-accent"
      >
        Editar
      </Link>
    </article>
  );
}
