'use client';

import { useCallback, useState } from 'react';

export type SortableImageListProps = {
  urls: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

function reorderUrls(urls: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= urls.length || to >= urls.length) {
    return urls;
  }
  const next = [...urls];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function isPreviewableUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith('data:image') || /^https?:\/\//i.test(trimmed);
}

export function SortableImageList({ urls, onChange, disabled = false }: SortableImageListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const moveItem = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= urls.length) return;
      onChange(reorderUrls(urls, index, target));
    },
    [urls, onChange],
  );

  const removeAt = useCallback(
    (index: number) => {
      onChange(urls.filter((_, i) => i !== index));
    },
    [urls, onChange],
  );

  const finishDrag = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (toIndex: number) => {
      if (dragIndex == null) {
        finishDrag();
        return;
      }
      onChange(reorderUrls(urls, dragIndex, toIndex));
      finishDrag();
    },
    [dragIndex, urls, onChange, finishDrag],
  );

  if (urls.length === 0) return null;

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
      {urls.map((url, index) => {
        const isDragging = dragIndex === index;
        const isDropTarget = dragOverIndex === index && dragIndex !== index;

        return (
          <li
            key={`${index}-${url.slice(0, 48)}`}
            draggable={!disabled}
            onDragStart={() => {
              if (disabled) return;
              setDragIndex(index);
            }}
            onDragEnd={finishDrag}
            onDragOver={(e) => {
              if (disabled || dragIndex == null) return;
              e.preventDefault();
              setDragOverIndex(index);
            }}
            onDragLeave={() => {
              if (dragOverIndex === index) setDragOverIndex(null);
            }}
            onDrop={(e) => {
              if (disabled) return;
              e.preventDefault();
              handleDrop(index);
            }}
            className={`group relative ${isDragging ? 'opacity-40' : ''} ${
              isDropTarget ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''
            }`}
          >
            <div className="aspect-square overflow-hidden rounded-lg border border-border bg-bg-muted">
              {url.trim() && isPreviewableUrl(url) ? (
                <img src={url.trim()} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : (
                <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-text-muted">
                  Sin vista previa
                </div>
              )}
            </div>

            {!disabled ? (
              <div
                className="absolute left-1 top-1 flex h-6 w-6 cursor-grab items-center justify-center rounded-md border border-border/80 bg-black/60 text-[10px] text-white active:cursor-grabbing"
                aria-hidden
                title="Arrastrar para reordenar"
              >
                ⋮⋮
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => removeAt(index)}
              disabled={disabled}
              className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-bg text-xs text-red-400 shadow hover:bg-bg-muted disabled:opacity-50"
              aria-label={`Quitar imagen ${index + 1}`}
            >
              ×
            </button>

            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 bg-black/70 p-1">
              <button
                type="button"
                onClick={() => moveItem(index, -1)}
                disabled={disabled || index === 0}
                className="rounded px-2 py-0.5 text-[10px] font-medium text-white hover:bg-white/15 disabled:opacity-30"
                aria-label={`Subir imagen ${index + 1}`}
              >
                Subir
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, 1)}
                disabled={disabled || index === urls.length - 1}
                className="rounded px-2 py-0.5 text-[10px] font-medium text-white hover:bg-white/15 disabled:opacity-30"
                aria-label={`Bajar imagen ${index + 1}`}
              >
                Bajar
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
