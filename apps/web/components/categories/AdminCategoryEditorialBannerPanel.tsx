'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, useToast } from '@/components';
import { ImageUploadHint } from '@/components/upload/ImageUploadHint';
import { AdminArchiveConfirmModal } from '@/components/admin/AdminArchiveConfirmModal';
import type { ContentMainCategory, CategoryEditorialBannerItem } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { useAdminCategoryEditorialBanners } from '@/lib/query/useCategoryEditorialBanner';
import { categoryEditorialBannersKeys } from '@/lib/query/keys';
import { useTenant } from '@/hooks/useTenant';
import { getErrorMessage } from '@/lib/errors';
import { useGcsImageUpload } from '@/lib/upload/use-gcs-image-upload';
import { IMAGE_ACCEPT_GCS } from '@/lib/upload/gcs-image-upload-config';

const TENANT_ID = 'tenant-demo';
const MAX_ITEMS = 5;

type FormState = {
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
};

const emptyForm = (): FormState => ({
  title: '',
  subtitle: '',
  imageUrl: '',
  ctaLabel: '',
  ctaHref: '',
});

function formFromItem(item: CategoryEditorialBannerItem): FormState {
  return {
    title: item.title,
    subtitle: item.subtitle ?? '',
    imageUrl: item.imageUrl,
    ctaLabel: item.ctaLabel ?? '',
    ctaHref: item.ctaHref ?? '',
  };
}

export function AdminCategoryEditorialBannerPanel({
  category,
}: {
  category: ContentMainCategory;
}) {
  const repos = useRepositories();
  const qc = useQueryClient();
  const { addToast } = useToast();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useAdminCategoryEditorialBanners(category);
  const items = data?.data ?? [];

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deactivateTarget, setDeactivateTarget] = useState<CategoryEditorialBannerItem | null>(
    null,
  );

  const { gcsMode, isUploading, uploadProgress, uploadSingleWithProgress } = useGcsImageUpload({
    scope: 'platform',
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: categoryEditorialBannersKeys.admin(category) });
    qc.invalidateQueries({ queryKey: categoryEditorialBannersKeys.public(t, category) });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      repos.categoryEditorialBanners.create({
        category,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        imageUrl: form.imageUrl,
        ctaLabel: form.ctaLabel.trim() || null,
        ctaHref: form.ctaHref.trim() || null,
        isActive: true,
      }),
    onSuccess: () => {
      addToast('Banner editorial creado', 'success');
      setMode('list');
      setForm(emptyForm());
      invalidate();
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      repos.categoryEditorialBanners.update(editingId!, {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        imageUrl: form.imageUrl,
        ctaLabel: form.ctaLabel.trim() || null,
        ctaHref: form.ctaHref.trim() || null,
      }),
    onSuccess: () => {
      addToast('Banner editorial actualizado', 'success');
      setMode('list');
      setEditingId(null);
      setForm(emptyForm());
      invalidate();
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => repos.categoryEditorialBanners.update(id, { isActive: true }),
    onSuccess: () => {
      addToast('Banner activado', 'success');
      invalidate();
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => repos.categoryEditorialBanners.update(id, { isActive: false }),
    onSuccess: () => {
      addToast('Banner desactivado', 'success');
      setDeactivateTarget(null);
      invalidate();
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      repos.categoryEditorialBanners.reorder(id, direction),
    onSuccess: invalidate,
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const startCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setMode('create');
  };

  const startEdit = (item: CategoryEditorialBannerItem) => {
    setForm(formFromItem(item));
    setEditingId(item.id);
    setMode('edit');
  };

  const handleImagePick = async (file: File | undefined) => {
    if (!file) return;
    const url = await uploadSingleWithProgress(file, 'banner');
    if (url) setForm((f) => ({ ...f, imageUrl: url }));
  };

  const canSubmit =
    form.title.trim().length > 0 &&
    form.imageUrl.length > 0 &&
    !isUploading &&
    !createMutation.isPending &&
    !updateMutation.isPending;

  const activeCount = items.filter((i) => i.isActive).length;

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="mt-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-text">
            {mode === 'create' ? 'Nuevo banner editorial' : 'Editar banner editorial'}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setMode('list');
              setEditingId(null);
              setForm(emptyForm());
            }}
          >
            Cancelar
          </Button>
        </div>

        <div className="grid gap-4 rounded-xl border border-border bg-bg-muted p-4 sm:grid-cols-2">
          <Input
            label="Título"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            maxLength={120}
          />
          <Input
            label="Subtítulo (opcional)"
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            maxLength={240}
          />
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-text">Imagen del banner</p>
            <ImageUploadHint variant="banner" options={{ gcs: gcsMode }} className="mb-2" />
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_ACCEPT_GCS}
              className="hidden"
              onChange={(e) => {
                void handleImagePick(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={!gcsMode || isUploading}
                onClick={() => fileRef.current?.click()}
              >
                {isUploading ? uploadProgress ?? 'Subiendo…' : 'Subir imagen'}
              </Button>
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt="Vista previa"
                  className="h-16 w-40 rounded object-cover"
                />
              ) : (
                <span className="text-xs text-text-muted">Sin imagen</span>
              )}
            </div>
          </div>
          <Input
            label="Etiqueta CTA (opcional)"
            value={form.ctaLabel}
            onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
            maxLength={48}
            placeholder="Ej. Ver más"
          />
          <Input
            label="Enlace CTA (opcional)"
            value={form.ctaHref}
            onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
            placeholder="/categorias o https://…"
          />
          <p className="sm:col-span-2 text-xs text-text-muted">
            El CTA requiere etiqueta y enlace. Rutas internas empiezan con /; externos usan http(s).
          </p>
        </div>

        {form.imageUrl && form.title.trim() ? (
          <div className="overflow-hidden rounded-xl border border-border">
            <p className="border-b border-border bg-bg-muted px-4 py-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Vista previa
            </p>
            <div className="relative h-40 bg-black sm:h-48">
              <img src={form.imageUrl} alt="" className="h-full w-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-lg font-bold text-white">{form.title}</p>
                {form.subtitle.trim() ? (
                  <p className="mt-1 text-sm text-white/80 line-clamp-2">{form.subtitle}</p>
                ) : null}
                {form.ctaLabel.trim() && form.ctaHref.trim() ? (
                  <span className="mt-2 inline-block rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg">
                    {form.ctaLabel}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => (mode === 'create' ? createMutation.mutate() : updateMutation.mutate())}
        >
          {createMutation.isPending || updateMutation.isPending
            ? 'Guardando…'
            : mode === 'create'
              ? 'Crear banner'
              : 'Guardar cambios'}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-xl border border-border bg-bg-muted p-4">
        <p className="text-sm font-medium text-text">Banners editoriales</p>
        <p className="mt-1 text-text-muted text-sm">
          Imagen, título y subtítulo personalizados para el hero de la categoría. Si hay banners
          activos, reemplazan el carrusel de eventos destacados en la landing pública.
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Activos: {activeCount} · Máximo {MAX_ITEMS} por categoría
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={startCreate} disabled={items.length >= MAX_ITEMS}>
          Crear banner editorial
        </Button>
      </div>

      {isLoading ? (
        <p className="text-text-muted">Cargando banners…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-muted">
          Sin banners editoriales. El hero público usa eventos destacados o contenido automático.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${
                item.isActive ? 'border-border bg-bg-muted' : 'border-border/60 bg-bg-muted/40 opacity-75'
              }`}
            >
              <img
                src={item.imageUrl}
                alt=""
                className="h-14 w-28 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text">{item.title}</p>
                {item.subtitle ? (
                  <p className="truncate text-xs text-text-muted">{item.subtitle}</p>
                ) : null}
                <p className="text-xs text-text-muted">
                  Orden {item.sortOrder + 1} · {item.isActive ? 'Activo' : 'Inactivo'}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={index === 0 || reorderMutation.isPending}
                  onClick={() => reorderMutation.mutate({ id: item.id, direction: 'up' })}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={index === items.length - 1 || reorderMutation.isPending}
                  onClick={() => reorderMutation.mutate({ id: item.id, direction: 'down' })}
                >
                  ↓
                </Button>
                <Button type="button" variant="secondary" onClick={() => startEdit(item)}>
                  Editar
                </Button>
                {item.isActive ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDeactivateTarget(item)}
                  >
                    Desactivar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={activateMutation.isPending}
                    onClick={() => activateMutation.mutate(item.id)}
                  >
                    Activar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminArchiveConfirmModal
        open={!!deactivateTarget}
        title="Desactivar banner editorial"
        description="El banner dejará de mostrarse en el hero público. Podés reactivarlo más adelante."
        confirmLabel="Desactivar"
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
        isPending={deactivateMutation.isPending}
      />
    </div>
  );
}
