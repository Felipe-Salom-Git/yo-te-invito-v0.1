'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  PageContainer,
  PageLoader,
  QueryError,
  useToast,
} from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { formatLegalDate, legalDocumentKeyLabel } from '@/lib/admin/admin-legal-labels';
import { LegalMarkdownPreview } from '@/lib/legal/renderLegalMarkdownPreview';
import {
  useAdminLegalDocument,
  usePublishLegalDocument,
  useSaveLegalDraft,
  useUpdateAdminLegalDocument,
} from '@/lib/query/admin-legal-documents';
import { AdminLegalVisibilityBadge } from './AdminLegalVisibilityBadge';
import { AdminLegalVersionStatusBadge } from './AdminLegalVersionStatusBadge';
import {
  AdminLegalDocumentMetadataForm,
  metadataFromDetail,
  type MetadataFormState,
} from './AdminLegalDocumentMetadataForm';
import {
  AdminLegalDocumentDraftEditor,
  type DraftFormState,
} from './AdminLegalDocumentDraftEditor';
import { AdminLegalDocumentPublishPanel } from './AdminLegalDocumentPublishPanel';

type TabId = 'metadata' | 'editor' | 'preview' | 'publish';

const TABS: { id: TabId; label: string }[] = [
  { id: 'metadata', label: 'Configuración' },
  { id: 'editor', label: 'Editor' },
  { id: 'preview', label: 'Vista previa' },
  { id: 'publish', label: 'Publicación' },
];

function draftFromDetail(detail: NonNullable<ReturnType<typeof useAdminLegalDocument>['data']>): DraftFormState {
  const d = detail.draftVersion;
  const doc = detail.document;
  return {
    title: d?.title ?? doc.title,
    summary: d?.summary ?? '',
    contentMarkdown: d?.contentMarkdown ?? '',
  };
}

type Props = {
  documentKey: string;
};

export function AdminLegalDocumentDetailClient({ documentKey }: Props) {
  const { data: session, status } = useSession();
  const { addToast } = useToast();
  const [tab, setTab] = useState<TabId>('metadata');
  const [metadata, setMetadata] = useState<MetadataFormState | null>(null);
  const [draft, setDraft] = useState<DraftFormState | null>(null);

  const detailQuery = useAdminLegalDocument(
    documentKey,
    status === 'authenticated',
  );
  const updateMeta = useUpdateAdminLegalDocument(documentKey);
  const saveDraftMutation = useSaveLegalDraft(documentKey);
  const publishMutation = usePublishLegalDocument(documentKey);

  const detail = detailQuery.data;

  useEffect(() => {
    if (!detail) return;
    setMetadata(metadataFromDetail(detail));
    setDraft(draftFromDetail(detail));
  }, [detail]);

  const handleSaveMetadata = () => {
    if (!metadata) return;
    updateMeta.mutate(
      {
        title: metadata.title.trim(),
        description: metadata.description.trim() || null,
        visibility: metadata.visibility,
        appliesToProfiles: metadata.appliesToProfiles,
        isRequiredForSignup: metadata.isRequiredForSignup,
        isRequiredForCheckout: metadata.isRequiredForCheckout,
        isRequiredForPortalAccess: metadata.isRequiredForPortalAccess,
        isActive: metadata.isActive,
      },
      {
        onSuccess: () => addToast('Configuración guardada', 'success'),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    saveDraftMutation.mutate(
      {
        title: draft.title.trim(),
        contentMarkdown: draft.contentMarkdown.trim(),
        summary: draft.summary.trim() || null,
      },
      {
        onSuccess: () => addToast('Borrador guardado', 'success'),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  const handlePublish = () => {
    const ok = window.confirm(
      '¿Publicar esta versión? La versión publicada actual se archivará y el borrador quedará vigente.',
    );
    if (!ok) return;
    publishMutation.mutate(
      {},
      {
        onSuccess: () => addToast('Versión publicada', 'success'),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  if (status === 'loading' || detailQuery.isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando documento…" />
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión como administrador.</p>
      </PageContainer>
    );
  }

  if (detailQuery.isError || !detail || !metadata || !draft) {
    return (
      <PageContainer>
        <Link href="/admin/legales" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Legales
        </Link>
        <QueryError
          message="No se pudo cargar el documento."
          onRetry={() => detailQuery.refetch()}
        />
      </PageContainer>
    );
  }

  const hasDraft = Boolean(detail.draftVersion);

  return (
    <PageContainer>
      <Link href="/admin/legales" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Legales
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{detail.document.title}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {legalDocumentKeyLabel(documentKey)} · <code>{documentKey}</code>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AdminLegalVisibilityBadge visibility={detail.document.visibility} />
            {detail.document.isActive ? (
              <span className="text-xs text-emerald-400">Activo</span>
            ) : (
              <span className="text-xs text-text-muted">Inactivo</span>
            )}
            {detail.publishedVersion ? (
              <span className="text-xs text-text-muted">
                Publicada: {detail.publishedVersion.version}{' '}
                <AdminLegalVersionStatusBadge status="PUBLISHED" />
              </span>
            ) : null}
            {detail.draftVersion ? (
              <AdminLegalVersionStatusBadge status="DRAFT" />
            ) : null}
          </div>
        </div>
        <Link
          href={`/admin/legales/${documentKey}/versiones`}
          className="text-sm font-medium text-accent hover:underline"
        >
          Ver historial de versiones
        </Link>
      </header>

      <div
        className="mt-6 flex gap-1 overflow-x-auto border-b border-border/80"
        role="tablist"
        aria-label="Secciones del documento"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === 'metadata' && (
          <AdminLegalDocumentMetadataForm
            state={metadata}
            onChange={setMetadata}
            onSave={handleSaveMetadata}
            saving={updateMeta.isPending}
          />
        )}
        {tab === 'editor' && (
          <AdminLegalDocumentDraftEditor
            state={draft}
            onChange={setDraft}
            onSave={handleSaveDraft}
            saving={saveDraftMutation.isPending}
          />
        )}
        {tab === 'preview' && (
          <div className="rounded-xl border border-border/80 bg-bg-muted/30 p-4">
            <p className="mb-3 text-xs text-text-muted">
              Vista previa del borrador (o vacío si no hay borrador guardado).
            </p>
            <LegalMarkdownPreview markdown={draft.contentMarkdown} />
          </div>
        )}
        {tab === 'publish' && (
          <AdminLegalDocumentPublishPanel
            detail={detail}
            hasDraft={hasDraft}
            onPublish={handlePublish}
            publishing={publishMutation.isPending}
          />
        )}
      </div>

      <p className="mt-6 text-xs text-text-muted">
        Última actualización del documento: {formatLegalDate(detail.document.updatedAt)}
      </p>
    </PageContainer>
  );
}
