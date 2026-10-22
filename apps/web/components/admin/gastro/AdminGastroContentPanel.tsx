'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { useRepositories } from '@/repositories/context';
import { gastroKeys } from '@/lib/query/keys';
import { gastroContentGalleryFromItem } from '@/lib/gastro/gastro-content-gallery';
import type { GastroContentStatus } from '@/repositories/interfaces';

const STATUS_LABEL: Record<GastroContentStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  inactive: 'Archivado',
};

type Props = {
  profileId: string;
};

export function AdminGastroContentPanel({ profileId }: Props) {
  const repos = useRepositories();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: gastroKeys.contentByProfile(profileId),
    queryFn: () => repos.gastro.listContentByProfile(profileId),
    enabled: !!profileId,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => repos.gastro.archiveContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gastroKeys.contentByProfile(profileId) });
      addToast('Publicación archivada', 'success');
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) =>
      repos.gastro.updateContent(id, { status: 'published' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gastroKeys.contentByProfile(profileId) });
      addToast('Publicación publicada', 'success');
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-text">Publicaciones del local</h2>
      <p className="mt-1 text-sm text-text-muted">
        Vista admin: estado y galería. Archivar oculta en público (status inactive). Sin motor de
        moderación.
      </p>

      {isLoading ? (
        <p className="mt-4 text-text-muted">Cargando publicaciones…</p>
      ) : isError ? (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-200">{getErrorMessage(error)}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">Sin publicaciones en este local.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const gallery = gastroContentGalleryFromItem(item);
            return (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-bg-muted p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-text">{item.title ?? 'Sin título'}</p>
                  <span className="rounded bg-border px-2 py-0.5 text-xs text-text-muted">
                    {STATUS_LABEL[item.status]}
                  </span>
                  <span className="rounded bg-border px-2 py-0.5 text-xs text-text-muted">
                    {item.type}
                  </span>
                </div>
                {item.body ? (
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-text-muted">
                    {item.body}
                  </p>
                ) : null}
                {gallery.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {gallery.map((url) => (
                      <li
                        key={url}
                        className="h-16 w-16 overflow-hidden rounded border border-border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.status !== 'published' ? (
                    <Button
                      size="sm"
                      onClick={() => publishMutation.mutate(item.id)}
                      disabled={publishMutation.isPending}
                    >
                      Publicar
                    </Button>
                  ) : null}
                  {item.status !== 'inactive' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => archiveMutation.mutate(item.id)}
                      disabled={archiveMutation.isPending}
                    >
                      Archivar
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
