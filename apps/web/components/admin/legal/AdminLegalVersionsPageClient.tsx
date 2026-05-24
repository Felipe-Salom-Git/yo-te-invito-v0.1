'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  PageContainer,
  PageLoader,
  QueryError,
  Button,
  EmptyState,
} from '@/components';
import {
  formatLegalDate,
  legalDocumentKeyLabel,
} from '@/lib/admin/admin-legal-labels';
import { LegalMarkdownPreview } from '@/lib/legal/renderLegalMarkdownPreview';
import {
  useAdminLegalDocument,
  useAdminLegalDocumentVersions,
} from '@/lib/query/admin-legal-documents';
import type { LegalDocumentVersionSummary } from '@/repositories/interfaces';
import { AdminLegalVersionStatusBadge } from './AdminLegalVersionStatusBadge';

type Props = {
  documentKey: string;
};

export function AdminLegalVersionsPageClient({ documentKey }: Props) {
  const { status } = useSession();
  const [viewVersionId, setViewVersionId] = useState<string | null>(null);

  const enabled = status === 'authenticated';
  const versionsQuery = useAdminLegalDocumentVersions(documentKey, enabled);
  const detailQuery = useAdminLegalDocument(documentKey, enabled);

  const payload = versionsQuery.data;
  const versions = payload?.data ?? [];
  const detail = detailQuery.data;

  const contentByVersionId = useMemo(() => {
    const map = new Map<string, string>();
    if (!detail) return map;
    if (detail.publishedVersion) {
      map.set(detail.publishedVersion.id, detail.publishedVersion.contentMarkdown);
    }
    if (detail.draftVersion) {
      map.set(detail.draftVersion.id, detail.draftVersion.contentMarkdown);
    }
    return map;
  }, [detail]);

  const viewing = versions.find((v) => v.id === viewVersionId);
  const viewingContent = viewVersionId ? contentByVersionId.get(viewVersionId) : undefined;

  const renderVersionRow = (v: LegalDocumentVersionSummary) => (
    <Button
      type="button"
      variant="secondary"
      className="text-xs"
      onClick={() => setViewVersionId(viewVersionId === v.id ? null : v.id)}
    >
      {viewVersionId === v.id ? 'Ocultar' : 'Ver'}
    </Button>
  );

  if (status === 'loading' || versionsQuery.isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando versiones…" />
      </PageContainer>
    );
  }

  if (versionsQuery.isError || !payload) {
    return (
      <PageContainer>
        <Link
          href={`/admin/legales/${documentKey}`}
          className="mb-4 inline-block text-sm text-text-muted hover:text-text"
        >
          ← Documento
        </Link>
        <QueryError
          message="No se pudo cargar el historial."
          onRetry={() => versionsQuery.refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link
        href={`/admin/legales/${documentKey}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← {payload.document.title}
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-text">Historial de versiones</h1>
        <p className="mt-1 text-sm text-text-muted">
          {legalDocumentKeyLabel(documentKey)} · <code>{documentKey}</code>
        </p>
      </header>

      {versions.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Sin versiones"
            description="Este documento aún no tiene versiones registradas."
          />
        </div>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto rounded-xl border border-border/80 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/80 bg-bg-muted/50 text-xs uppercase text-text-muted">
                <tr>
                  <th className="px-4 py-3">Versión</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Publicada</th>
                  <th className="px-4 py-3">Actualizada</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {versions.map((v) => (
                  <tr key={v.id} className="bg-bg/40">
                    <td className="px-4 py-3 font-mono text-text">{v.version}</td>
                    <td className="px-4 py-3">
                      <AdminLegalVersionStatusBadge status={v.status} />
                    </td>
                    <td className="px-4 py-3 text-text-muted">{v.title}</td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {formatLegalDate(v.publishedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {formatLegalDate(v.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">{renderVersionRow(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 space-y-3 md:hidden">
            {versions.map((v) => (
              <li
                key={v.id}
                className="rounded-xl border border-border/80 bg-bg-muted/30 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-medium text-text">{v.version}</span>
                  <AdminLegalVersionStatusBadge status={v.status} />
                </div>
                <p className="mt-1 text-sm text-text-muted">{v.title}</p>
                <p className="mt-2 text-xs text-text-muted">
                  {formatLegalDate(v.updatedAt)}
                </p>
                <div className="mt-3">{renderVersionRow(v)}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {viewing ? (
        <div className="mt-6 rounded-xl border border-border/80 bg-bg-muted/30 p-4">
          <h2 className="text-sm font-semibold text-text">
            {viewing.title} · {viewing.version}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            <AdminLegalVersionStatusBadge status={viewing.status} />
          </p>
          <div className="mt-4 max-h-[480px] overflow-y-auto">
            {viewingContent !== undefined ? (
              <LegalMarkdownPreview markdown={viewingContent} />
            ) : (
              <p className="text-sm text-text-muted">
                El contenido completo de versiones archivadas no está en el listado. La versión
                publicada y el borrador actual se pueden previsualizar aquí; para archivadas usá el
                detalle del documento o auditoría.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
