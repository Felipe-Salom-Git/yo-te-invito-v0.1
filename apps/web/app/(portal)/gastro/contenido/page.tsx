'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { GastroContent } from '@/repositories/interfaces';

const TENANT_ID = 'tenant-demo';

export default function GastroContenidoPage() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPatch, setEditPatch] = useState<Partial<GastroContent>>({});

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'gastro', TENANT_ID],
    queryFn: () => repos.events.list({ tenantId: TENANT_ID, category: 'gastro', limit: 50 }),
  });

  const { data: content = [], isLoading } = useQuery({
    queryKey: ['gastroContent', selectedEventId],
    queryFn: () => repos.gastro.listContent(selectedEventId),
    enabled: !!selectedEventId,
  });

  const createMutation = useMutation({
    mutationFn: (eventId: string) =>
      repos.gastro.createContent(eventId, {
        type: newImageUrl ? 'image' : 'editorial',
        title: newTitle.trim() || undefined,
        body: [newBody.trim(), newLocation.trim()].filter(Boolean).join('\nUbicación: ') || undefined,
        imageUrl: newImageUrl.trim() || undefined,
        sortOrder: content.length,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['gastroContent', eventId] });
      setShowCreate(false);
      setNewTitle('');
      setNewBody('');
      setNewImageUrl('');
      setNewLocation('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<GastroContent> }) =>
      repos.gastro.updateContent(id, patch),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastroContent', selectedEventId] });
      setEditingId(null);
      setEditPatch({});
    },
  });

  const events = eventsData?.data ?? [];
  const currentEventId = selectedEventId || events[0]?.id;
  useEffect(() => {
    if (!selectedEventId && events[0]) setSelectedEventId(events[0].id);
  }, [events, selectedEventId]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setNewImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  if (events.length === 0) {
    return (
      <PageContainer>
        <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Dashboard
        </Link>
        <SectionTitle>Contenido</SectionTitle>
        <p className="mt-4 text-text-muted">No hay eventos gastro para gestionar contenido.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <SectionTitle>Contenido editorial</SectionTitle>
      <p className="mt-2 text-text-muted">Información del establecimiento: imágenes, descripción, ubicación.</p>

      <div className="mt-6">
        <label className="block text-sm font-medium text-text">Evento / Establecimiento</label>
        <select
          value={currentEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="mt-1 rounded border border-border bg-bg px-3 py-2 text-text"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
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
              <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="URL o subir abajo" />
              <input type="file" accept="image/*" onChange={handleFileChange} className="mt-2 text-sm text-text-muted" />
            </div>
            <Input label="Ubicación (dirección o mapa)" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="mt-3" placeholder="Dirección o link a maps" />
            <div className="mt-3 flex gap-2">
              <Button onClick={() => currentEventId && createMutation.mutate(currentEventId)} disabled={createMutation.isPending}>
                Crear
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {content.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-bg-muted p-4">
              {editingId === c.id ? (
                <div>
                  <Input label="Título" value={editPatch.title ?? c.title ?? ''} onChange={(e) => setEditPatch((p) => ({ ...p, title: e.target.value }))} />
                  <div className="mt-2">
                    <label className="block text-sm text-text-muted">Cuerpo</label>
                    <textarea
                      value={editPatch.body ?? c.body ?? ''}
                      onChange={(e) => setEditPatch((p) => ({ ...p, body: e.target.value }))}
                      rows={2}
                      className="w-full rounded border border-border bg-bg px-2 py-1 text-text"
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => updateMutation.mutate({ id: c.id, patch: editPatch })} disabled={updateMutation.isPending}>
                      Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditPatch({}); }}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-medium text-text">{c.title ?? c.type}</p>
                  {c.body && <p className="mt-2 text-sm text-text-muted whitespace-pre-wrap">{c.body}</p>}
                  {c.imageUrl && <img src={c.imageUrl} alt="" className="mt-2 max-h-32 rounded object-cover" />}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded bg-border px-2 py-0.5 text-xs text-text-muted">{c.type}</span>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(c.id); setEditPatch({ title: c.title ?? undefined, body: c.body ?? undefined }); }}>
                      Editar
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {content.length === 0 && !isLoading && !showCreate && (
        <p className="mt-6 text-text-muted">Sin contenido aún. Creá uno con el botón arriba.</p>
      )}
    </PageContainer>
  );
}
