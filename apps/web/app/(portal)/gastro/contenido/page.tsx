'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { GastroContent, GastroContentStatus } from '@/repositories/interfaces';
import { LatLngMapPreview } from '@/components/admin/LatLngMapPreview';
import { ImageUrlPreview } from '@/components/admin/ImageUrlPreview';
import { gastroKeys } from '@/lib/query/keys';
import { useGastroContentList, useGastroContentMutations } from '@/lib/query/gastro-content';
import {
  IMAGE_ACCEPT_GCS,
  type GcsImageUploadConfig,
} from '@/lib/upload/gcs-image-upload-config';
import { useGcsImageUpload } from '@/lib/upload/use-gcs-image-upload';
import { isDataImageUrl } from '@/lib/upload/validate-public-image-file';

const TENANT_ID = 'tenant-demo';

const STATUS_LABEL: Record<GastroContentStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  inactive: 'Inactivo',
};

export default function GastroContenidoPage() {
  const repos = useRepositories();
  const { addToast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newGeoLat, setNewGeoLat] = useState('');
  const [newGeoLng, setNewGeoLng] = useState('');
  const [newStatus, setNewStatus] = useState<GastroContentStatus>('draft');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPatch, setEditPatch] = useState<Partial<GastroContent>>({});

  const { data: local, isLoading: localLoading } = useQuery({
    queryKey: gastroKeys.local(),
    queryFn: () => repos.gastro.getMyLocal(),
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'gastro', TENANT_ID],
    queryFn: () => repos.events.list({ tenantId: TENANT_ID, category: 'gastro', limit: 50 }),
  });

  const events = eventsData?.data ?? [];
  const defaultEventId = local?.publicEventId ?? events[0]?.id;
  const currentEventId = selectedEventId || defaultEventId;

  const {
    data: content = [],
    isLoading: contentLoading,
    isError: contentError,
    error: contentQueryError,
    refetch: refetchContent,
  } = useGastroContentList(currentEventId);

  const { createMutation, updateMutation } = useGastroContentMutations(currentEventId);

  const uploadConfig = useMemo((): GcsImageUploadConfig | undefined => {
    if (!local?.id) return undefined;
    return { scope: 'gastro', entityId: local.id };
  }, [local?.id]);

  const { gcsMode, isUploading, uploadProgress, uploadSingleWithProgress } =
    useGcsImageUpload(uploadConfig);

  useEffect(() => {
    if (!selectedEventId && defaultEventId) setSelectedEventId(defaultEventId);
  }, [defaultEventId, selectedEventId]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      if (gcsMode) {
        const url = await uploadSingleWithProgress(file, 'content');
        if (url) setNewImageUrl(url);
        return;
      }

      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => setNewImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    },
    [gcsMode, uploadSingleWithProgress],
  );

  const rejectDataUrlIfGcs = useCallback(
    (url: string): boolean => {
      if (gcsMode && isDataImageUrl(url)) {
        addToast(
          'Las imágenes embebidas (data-URL) no están permitidas. Subí un archivo o pegá una URL https.',
          'error',
        );
        return true;
      }
      return false;
    },
    [addToast, gcsMode],
  );

  const buildBodyFromFields = () => {
    const locLine = newLocation.trim();
    const coordLine =
      newGeoLat.trim() && newGeoLng.trim()
        ? `Coordenadas (mapa): ${newGeoLat.trim()}, ${newGeoLng.trim()}`
        : '';
    return [newBody.trim(), locLine && `Ubicación: ${locLine}`, coordLine].filter(Boolean).join('\n');
  };

  const handleCreate = () => {
    if (!currentEventId) return;
    const bodyText = buildBodyFromFields();
    const hasImage = Boolean(newImageUrl.trim());
    createMutation.mutate(
      {
        type: hasImage && !bodyText && !newTitle.trim() ? 'image' : 'editorial',
        title: newTitle.trim() || undefined,
        body: bodyText || undefined,
        imageUrl: newImageUrl.trim() || undefined,
        sortOrder: content.length,
        status: newStatus,
      },
      {
        onError: (err) => addToast(getErrorMessage(err), 'error'),
        onSuccess: () => {
          addToast('Contenido creado', 'success');
          setShowCreate(false);
          setNewTitle('');
          setNewBody('');
          setNewImageUrl('');
          setNewLocation('');
          setNewGeoLat('');
          setNewGeoLng('');
          setNewStatus('draft');
        },
      },
    );
  };

  const handleUpdate = (id: string, patch: Partial<GastroContent>) => {
    updateMutation.mutate(
      { id, patch },
      {
        onError: (err) => addToast(getErrorMessage(err), 'error'),
        onSuccess: () => {
          addToast('Contenido actualizado', 'success');
          setEditingId(null);
          setEditPatch({});
        },
      },
    );
  };

  if (localLoading || eventsLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (!local?.publicEventId && events.length === 0) {
    return (
      <PageContainer>
        <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Dashboard
        </Link>
        <SectionTitle>Contenido</SectionTitle>
        <p className="mt-4 text-text-muted">
          Configurá tu local en{' '}
          <Link href="/gastro/local" className="text-accent hover:underline">
            Mi local
          </Link>{' '}
          para vincular un evento público y gestionar contenido editorial.
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <SectionTitle>Contenido editorial</SectionTitle>
      <p className="mt-2 text-text-muted">
        Bloques de texto e imágenes para la ficha pública. Solo el estado{' '}
        <span className="text-text">Publicado</span> aparece en el sitio.
      </p>
      <p className="mt-1 text-xs text-text-muted">
        Imágenes vía Google Cloud Storage (JPEG, PNG o WEBP, máx. 5 MB) o URL https.
      </p>

      <div className="mt-6">
        <label className="block text-sm font-medium text-text">Evento / Establecimiento</label>
        <select
          value={currentEventId ?? ''}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="mt-1 rounded border border-border bg-bg px-3 py-2 text-text"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
              {e.id === local?.publicEventId ? ' (tu local)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <Button onClick={() => setShowCreate(!showCreate)} variant="outline">
          {showCreate ? 'Cancelar' : 'Crear contenido'}
        </Button>
        {showCreate && (
          <div className="mt-4 rounded-lg border border-border bg-bg-muted p-4">
            <Input label="Título" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <div className="mt-3">
              <label className="mb-1.5 block text-sm font-medium text-text">Descripción</label>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={3}
                className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
              />
            </div>
            <div className="mt-3">
              <label className="mb-1.5 block text-sm font-medium text-text">Imagen</label>
              {uploadProgress ? (
                <p className="mb-2 text-sm text-accent" role="status">
                  {uploadProgress}
                </p>
              ) : null}
              <Input
                value={newImageUrl}
                onChange={(e) => {
                  const url = e.target.value;
                  if (rejectDataUrlIfGcs(url)) return;
                  setNewImageUrl(url);
                }}
                placeholder="https://…"
                disabled={isUploading}
              />
              <input
                type="file"
                accept={gcsMode ? IMAGE_ACCEPT_GCS : 'image/*'}
                onChange={handleFileChange}
                disabled={isUploading}
                className="mt-2 text-sm text-text-muted disabled:opacity-50"
              />
              <ImageUrlPreview url={newImageUrl} />
            </div>
            <Input
              label="Ubicación (dirección o mapa)"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="mt-3"
              placeholder="Dirección o link a maps"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Input
                label="Lat (opcional)"
                value={newGeoLat}
                onChange={(e) => setNewGeoLat(e.target.value)}
                placeholder="-34.6"
              />
              <Input
                label="Lng (opcional)"
                value={newGeoLng}
                onChange={(e) => setNewGeoLng(e.target.value)}
                placeholder="-58.4"
              />
            </div>
            <LatLngMapPreview lat={newGeoLat} lng={newGeoLng} />
            <div className="mt-3">
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
            <div className="mt-3 flex gap-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending || isUploading}>
                Crear
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      {contentError ? (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-200">
            No se pudo cargar el contenido: {getErrorMessage(contentQueryError)}
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => refetchContent()}>
            Reintentar
          </Button>
        </div>
      ) : contentLoading ? (
        <p className="mt-6 text-text-muted">Cargando contenido…</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {content.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-bg-muted p-4">
              {editingId === c.id ? (
                <div>
                  <Input
                    label="Título"
                    value={editPatch.title ?? c.title ?? ''}
                    onChange={(e) => setEditPatch((p) => ({ ...p, title: e.target.value }))}
                  />
                  <div className="mt-2">
                    <label className="block text-sm text-text-muted">Cuerpo</label>
                    <textarea
                      value={editPatch.body ?? c.body ?? ''}
                      onChange={(e) => setEditPatch((p) => ({ ...p, body: e.target.value }))}
                      rows={3}
                      className="w-full rounded border border-border bg-bg px-2 py-1 text-text"
                    />
                  </div>
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-text">Estado</label>
                    <select
                      value={editPatch.status ?? c.status}
                      onChange={(e) =>
                        setEditPatch((p) => ({
                          ...p,
                          status: e.target.value as GastroContentStatus,
                        }))
                      }
                      className="mt-1 rounded border border-border bg-bg px-3 py-2 text-text"
                    >
                      {(Object.keys(STATUS_LABEL) as GastroContentStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(c.id, editPatch)}
                      disabled={updateMutation.isPending}
                    >
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditPatch({});
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text">{c.title ?? c.type}</p>
                    <span className="rounded bg-border px-2 py-0.5 text-xs text-text-muted">
                      {STATUS_LABEL[c.status]}
                    </span>
                    <span className="rounded bg-border px-2 py-0.5 text-xs text-text-muted">
                      {c.type}
                    </span>
                  </div>
                  {c.body && (
                    <p className="mt-2 text-sm text-text-muted whitespace-pre-wrap">{c.body}</p>
                  )}
                  {c.imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={c.imageUrl} alt="" className="mt-2 max-h-32 rounded object-cover" />
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditPatch({
                          title: c.title ?? undefined,
                          body: c.body ?? undefined,
                          status: c.status,
                        });
                      }}
                    >
                      Editar
                    </Button>
                    {c.status !== 'published' ? (
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(c.id, { status: 'published' })}
                        disabled={updateMutation.isPending}
                      >
                        Publicar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdate(c.id, { status: 'inactive' })}
                        disabled={updateMutation.isPending}
                      >
                        Desactivar
                      </Button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {content.length === 0 && !contentLoading && !contentError && !showCreate && (
        <p className="mt-6 text-text-muted">Sin contenido aún. Creá uno con el botón arriba.</p>
      )}
    </PageContainer>
  );
}
