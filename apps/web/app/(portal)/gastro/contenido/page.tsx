'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { GastroContent, GastroContentStatus } from '@/repositories/interfaces';
import { gastroKeys } from '@/lib/query/keys';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { GastroLocationSelector } from '@/components/gastro/GastroLocationSelector';
import { GastroContentGalleryField } from '@/components/gastro/GastroContentGalleryField';
import {
  useGastroContentListByProfile,
  useGastroContentMutationsByProfile,
} from '@/lib/query/gastro-content';
import { gastroContentGalleryFromItem } from '@/lib/gastro/gastro-content-gallery';

const STATUS_LABEL: Record<GastroContentStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  inactive: 'Archivado',
};

export default function GastroContenidoPage() {
  const repos = useRepositories();
  const { addToast } = useToast();
  const { profileId } = useGastroActiveLocation();

  const { data: local, isLoading: localLoading } = useQuery({
    queryKey: gastroKeys.local(profileId),
    queryFn: () => repos.gastro.getMyLocal(profileId),
    enabled: !!profileId,
  });

  const effectiveProfileId = profileId ?? local?.id;

  const {
    data: content = [],
    isLoading: contentLoading,
    isError: contentError,
    error: contentQueryError,
    refetch: refetchContent,
  } = useGastroContentListByProfile(effectiveProfileId);

  const { createMutation, updateMutation, archiveMutation } =
    useGastroContentMutationsByProfile(effectiveProfileId);

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newGallery, setNewGallery] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState<GastroContentStatus>('draft');
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editGallery, setEditGallery] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<GastroContentStatus>('draft');

  const resetCreate = () => {
    setShowCreate(false);
    setNewTitle('');
    setNewBody('');
    setNewGallery([]);
    setNewStatus('draft');
  };

  const handleCreate = () => {
    if (!effectiveProfileId) return;
    const title = newTitle.trim();
    const body = newBody.trim();
    const galleryUrls = newGallery.filter(Boolean);
    if (!title && !body && galleryUrls.length === 0) {
      addToast('Agregá título, texto o al menos una imagen', 'error');
      return;
    }
    const type: GastroContent['type'] =
      galleryUrls.length > 0 && !title && !body ? 'image' : 'editorial';
    createMutation.mutate(
      {
        type,
        title: title || null,
        body: body || null,
        galleryUrls,
        imageUrl: galleryUrls[0] ?? null,
        status: newStatus,
      },
      {
        onError: (err) => addToast(getErrorMessage(err), 'error'),
        onSuccess: () => {
          addToast('Publicación creada', 'success');
          resetCreate();
        },
      },
    );
  };

  const startEdit = (c: GastroContent) => {
    setEditingId(c.id);
    setEditTitle(c.title ?? '');
    setEditBody(c.body ?? '');
    setEditGallery(gastroContentGalleryFromItem(c));
    setEditStatus(c.status);
  };

  const handleUpdate = () => {
    if (!editingId) return;
    const galleryUrls = editGallery.filter(Boolean);
    updateMutation.mutate(
      {
        id: editingId,
        patch: {
          title: editTitle.trim() || null,
          body: editBody.trim() || null,
          galleryUrls,
          imageUrl: galleryUrls[0] ?? null,
          status: editStatus,
        },
      },
      {
        onError: (err) => addToast(getErrorMessage(err), 'error'),
        onSuccess: () => {
          addToast('Publicación actualizada', 'success');
          setEditingId(null);
        },
      },
    );
  };

  const handleArchive = (id: string) => {
    archiveMutation.mutate(id, {
      onError: (err) => addToast(getErrorMessage(err), 'error'),
      onSuccess: () => addToast('Publicación archivada', 'success'),
    });
  };

  if (localLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (!effectiveProfileId) {
    return (
      <PageContainer>
        <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Dashboard
        </Link>
        <SectionTitle>Publicaciones</SectionTitle>
        <div className="mt-4 max-w-md">
          <GastroLocationSelector />
        </div>
        <p className="mt-4 text-text-muted">
          Seleccioná un local o configurá uno en{' '}
          <Link href="/gastro/local" className="text-accent hover:underline">
            Mi local
          </Link>
          .
        </p>
      </PageContainer>
    );
  }

  if (!local?.publicEventId) {
    return (
      <PageContainer>
        <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Dashboard
        </Link>
        <SectionTitle>Publicaciones</SectionTitle>
        <div className="mt-4 max-w-md">
          <GastroLocationSelector />
        </div>
        <p className="mt-4 text-text-muted">
          Completá la ficha del local para habilitar la ficha pública y las publicaciones.
        </p>
        <Link
          href={`/gastro/local/editar${profileId ? `?profileId=${encodeURIComponent(profileId)}` : ''}`}
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          Editar local →
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <SectionTitle>Publicaciones</SectionTitle>
      <div className="mt-4 max-w-md">
        <GastroLocationSelector />
      </div>
      <p className="mt-2 text-text-muted">
        Publicaciones del local <span className="font-medium text-text">{local.displayName}</span>.
        Solo el estado <span className="text-text">Publicado</span> aparece en la ficha pública.
      </p>
      {local.id ? (
        <Link
          href={`/gastronomicos/${local.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-sm text-accent hover:underline"
        >
          Ver ficha pública →
        </Link>
      ) : null}

      <div className="mt-6">
        <Button onClick={() => setShowCreate(!showCreate)} variant="outline">
          {showCreate ? 'Cancelar' : 'Nueva publicación'}
        </Button>
        {showCreate ? (
          <div className="mt-4 space-y-4 rounded-lg border border-border bg-bg-muted p-4">
            <Input label="Título" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Descripción</label>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={4}
                className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
              />
            </div>
            <GastroContentGalleryField
              value={newGallery}
              onChange={setNewGallery}
              gastroProfileId={local.id}
              onUploadingChange={setUploading}
            />
            <div>
              <label className="block text-sm font-medium text-text">Estado</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as GastroContentStatus)}
                className="mt-1 rounded border border-border bg-bg px-3 py-2 text-text"
              >
                {(Object.keys(STATUS_LABEL) as GastroContentStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || uploading}
              >
                Crear
              </Button>
              <Button variant="outline" onClick={resetCreate}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {contentError ? (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-200">
            No se pudo cargar: {getErrorMessage(contentQueryError)}
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => refetchContent()}>
            Reintentar
          </Button>
        </div>
      ) : contentLoading ? (
        <p className="mt-6 text-text-muted">Cargando publicaciones…</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {content.map((c) => {
            const gallery = gastroContentGalleryFromItem(c);
            return (
              <li key={c.id} className="rounded-lg border border-border bg-bg-muted p-4">
                {editingId === c.id ? (
                  <div className="space-y-3">
                    <Input
                      label="Título"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <div>
                      <label className="block text-sm text-text-muted">Descripción</label>
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={4}
                        className="mt-1 w-full rounded border border-border bg-bg px-2 py-1 text-text"
                      />
                    </div>
                    <GastroContentGalleryField
                      value={editGallery}
                      onChange={setEditGallery}
                      gastroProfileId={local.id}
                      onUploadingChange={setUploading}
                    />
                    <div>
                      <label className="block text-sm font-medium text-text">Estado</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as GastroContentStatus)}
                        className="mt-1 rounded border border-border bg-bg px-3 py-2 text-text"
                      >
                        {(Object.keys(STATUS_LABEL) as GastroContentStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleUpdate}
                        disabled={updateMutation.isPending || uploading}
                      >
                        Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-text">{c.title ?? 'Sin título'}</p>
                      <span className="rounded bg-border px-2 py-0.5 text-xs text-text-muted">
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    {c.body ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">{c.body}</p>
                    ) : null}
                    {gallery.length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {gallery.map((url) => (
                          <li key={url} className="h-20 w-20 overflow-hidden rounded border border-border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(c)}>
                        Editar
                      </Button>
                      {c.status !== 'published' ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateMutation.mutate(
                              { id: c.id, patch: { status: 'published' } },
                              {
                                onError: (err) => addToast(getErrorMessage(err), 'error'),
                                onSuccess: () => addToast('Publicada', 'success'),
                              },
                            )
                          }
                          disabled={updateMutation.isPending}
                        >
                          Publicar
                        </Button>
                      ) : null}
                      {c.status !== 'inactive' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchive(c.id)}
                          disabled={archiveMutation.isPending}
                        >
                          Archivar
                        </Button>
                      ) : null}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {content.length === 0 && !contentLoading && !contentError && !showCreate ? (
        <p className="mt-6 text-text-muted">Sin publicaciones aún. Creá una con el botón arriba.</p>
      ) : null}
    </PageContainer>
  );
}
