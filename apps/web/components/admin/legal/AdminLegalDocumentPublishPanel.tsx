'use client';

import { Button } from '@/components';
import { formatLegalDate } from '@/lib/admin/admin-legal-labels';
import type { AdminLegalDocumentDetail } from '@/repositories/interfaces';

type Props = {
  detail: AdminLegalDocumentDetail;
  hasDraft: boolean;
  onPublish: () => void;
  publishing: boolean;
};

export function AdminLegalDocumentPublishPanel({
  detail,
  hasDraft,
  onPublish,
  publishing,
}: Props) {
  const published = detail.publishedVersion;
  const draft = detail.draftVersion;

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-bg-muted/30 p-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
        Al publicar, la versión publicada actual quedará <strong>archivada</strong> y el borrador
        pasará a ser la versión vigente. Esta acción no se puede deshacer desde la UI.
      </div>

      {published ? (
        <div className="text-sm text-text-muted">
          <p className="font-medium text-text">Versión publicada actual</p>
          <p className="mt-1">
            {published.version} · {formatLegalDate(published.publishedAt)}
          </p>
        </div>
      ) : (
        <p className="text-sm text-amber-400">Aún no hay versión publicada.</p>
      )}

      {draft ? (
        <div className="text-sm text-text-muted">
          <p className="font-medium text-text">Borrador a publicar</p>
          <p className="mt-1">
            {draft.version} · {draft.title}
          </p>
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          No hay borrador. Guardá un borrador en la pestaña Editor antes de publicar.
        </p>
      )}

      <Button type="button" onClick={onPublish} disabled={!hasDraft || publishing}>
        {publishing ? 'Publicando…' : 'Publicar versión'}
      </Button>
    </div>
  );
}
