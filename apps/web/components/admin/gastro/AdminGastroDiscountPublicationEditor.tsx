'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, useToast } from '@/components';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';
import { getErrorMessage } from '@/lib/errors';
import type { AdminGastroDiscountDetail } from '@/repositories/interfaces';

type Props = {
  profileId: string;
  discount: AdminGastroDiscountDetail;
  onSaved?: () => void;
};

function readImageFilesAsDataUrls(files: File[]): Promise<string[]> {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
  if (imageFiles.length === 0) return Promise.resolve([]);
  return Promise.all(
    imageFiles.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        }),
    ),
  );
}

export function AdminGastroDiscountPublicationEditor({ profileId, discount, onSaved }: Props) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [title, setTitle] = useState(discount.title ?? '');
  const [summary, setSummary] = useState(discount.summary ?? '');
  const [detail, setDetail] = useState(discount.detail ?? '');
  const initialDisplayUrls =
    discount.displayImageUrls.length > 0
      ? discount.displayImageUrls
      : discount.submittedImageUrls;
  const [displayUrls, setDisplayUrls] = useState<string[]>(initialDisplayUrls);
  const [urlDraft, setUrlDraft] = useState('');

  useEffect(() => {
    setTitle(discount.title ?? '');
    setSummary(discount.summary ?? '');
    setDetail(discount.detail ?? '');
    setDisplayUrls(
      discount.displayImageUrls.length > 0
        ? discount.displayImageUrls
        : discount.submittedImageUrls,
    );
  }, [discount]);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: adminGastroKeys.discount(profileId, discount.id),
    });
    queryClient.invalidateQueries({ queryKey: adminGastroKeys.discounts(profileId) });
    queryClient.invalidateQueries({ queryKey: adminGastroKeys.detail(profileId) });
    queryClient.invalidateQueries({ queryKey: adminGastroKeys.all });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      repos.adminGastro.updatePublication(profileId, discount.id, {
        title: title.trim(),
        summary: summary.trim(),
        detail: detail.trim(),
        displayImageUrls: displayUrls.filter(Boolean),
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Publicación guardada', 'success');
      invalidate();
      onSaved?.();
    },
  });

  const removeAt = (index: number) =>
    setDisplayUrls((urls) => urls.filter((_, i) => i !== index));

  const setAsHeader = (index: number) => {
    if (index === 0) return;
    setDisplayUrls((urls) => {
      const next = [...urls];
      const [item] = next.splice(index, 1);
      return [item, ...next];
    });
  };

  const addFromSubmitted = (url: string) => {
    if (!url.trim() || displayUrls.includes(url)) return;
    setDisplayUrls((urls) => [...urls, url]);
  };

  const handleFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const dataUrls = await readImageFilesAsDataUrls(files);
    if (dataUrls.length > 0) setDisplayUrls((urls) => [...urls, ...dataUrls]);
  }, []);

  const addUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    setDisplayUrls((urls) => [...urls, url]);
    setUrlDraft('');
  };

  const closed = ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(discount.status);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-text">Publicación</h3>
        <p className="mt-1 text-sm text-text-muted">
          La primera imagen de la lista es la de cabecera. Guardá antes de aprobar.
        </p>
      </div>

      {discount.submittedImageUrls.length > 0 && (
        <div className="rounded-lg border border-border bg-bg-muted/40 p-4">
          <p className="text-sm font-medium text-text">Imágenes enviadas por el local</p>
          <p className="mt-1 text-xs text-text-muted">
            Hacé clic en una imagen para agregarla a la publicación.
          </p>
          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {discount.submittedImageUrls.map((url, index) => (
              <li key={`sub-${index}-${url.slice(0, 24)}`}>
                <button
                  type="button"
                  disabled={closed || displayUrls.includes(url)}
                  onClick={() => addFromSubmitted(url)}
                  className="group relative block w-full overflow-hidden rounded-lg border border-border disabled:opacity-50"
                >
                  <div className="aspect-square bg-bg-muted">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[10px] text-white opacity-0 group-hover:opacity-100">
                    {displayUrls.includes(url) ? 'Ya en publicación' : 'Agregar'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-text">Imágenes de la publicación</p>
        {displayUrls.length > 0 ? (
          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {displayUrls.map((url, index) => (
              <li key={`pub-${index}-${url.slice(0, 24)}`} className="relative">
                <div className="aspect-square overflow-hidden rounded-lg border border-border bg-bg-muted">
                  {index === 0 && (
                    <span className="absolute left-1 top-1 z-10 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-bg">
                      Cabecera
                    </span>
                  )}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
                {!closed && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => setAsHeader(index)}
                        className="text-[10px] text-accent hover:underline"
                      >
                        Cabecera
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-amber-400">
            Sin imágenes en la publicación. Agregá al menos una antes de aprobar.
          </p>
        )}

        {!closed && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-bg-muted px-3 py-2 text-sm font-medium text-text hover:border-accent">
              Subir imágenes
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="sr-only"
              />
            </label>
            <div className="flex min-w-[200px] flex-1 flex-wrap items-end gap-2">
              <Input
                label="URL"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addUrl();
                  }
                }}
              />
              <button
                type="button"
                onClick={addUrl}
                disabled={!urlDraft.trim()}
                className="mb-0.5 rounded-lg border border-border px-3 py-2 text-sm text-accent hover:border-accent disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>
        )}
      </div>

      <Input
        label="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={closed}
      />
      <div>
        <label className="mb-1 block text-sm text-text-muted">Resumen</label>
        <textarea
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={closed}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-muted">Detalle</label>
        <textarea
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          rows={5}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          disabled={closed}
        />
      </div>

      {!closed && (
        <Button
          type="button"
          disabled={
            saveMutation.isPending ||
            !title.trim() ||
            !summary.trim() ||
            !detail.trim() ||
            displayUrls.length === 0
          }
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'Guardando…' : 'Guardar publicación'}
        </Button>
      )}
    </div>
  );
}
