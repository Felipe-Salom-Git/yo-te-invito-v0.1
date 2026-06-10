'use client';

import { useState } from 'react';
import { formatContentTagHashtag } from '@yo-te-invito/shared';
import { Button, EmptyState, Input } from '@/components';
import { contentTagScopeLabel } from '@/lib/admin/content-tag-scope-labels';
import type { ContentTagAdmin, ContentTagScope } from '@/repositories/interfaces';
import { CONTENT_TAG_SCOPE_OPTIONS } from '@/lib/admin/content-tag-scope-labels';

type AdminContentTagListProps = {
  items: ContentTagAdmin[];
  isLoading: boolean;
  isMutating: boolean;
  onSave: (
    id: string,
    patch: { name?: string; description?: string | null; categoryScope?: ContentTagScope | null },
  ) => void;
  onArchive: (item: ContentTagAdmin) => void;
  onRestore: (item: ContentTagAdmin) => void;
};

export function AdminContentTagList({
  items,
  isLoading,
  isMutating,
  onSave,
  onArchive,
  onRestore,
}: AdminContentTagListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editScope, setEditScope] = useState<ContentTagScope | 'all'>('all');

  if (isLoading) {
    return (
      <div className="mt-8 space-y-3" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-border/60 bg-bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        className="mt-8"
        title="Sin etiquetas"
        description="Creá la primera etiqueta con el formulario de arriba. Solo las activas aparecen en formularios y búsqueda pública."
      />
    );
  }

  const scopeOptions = CONTENT_TAG_SCOPE_OPTIONS.filter((o) => o.value !== 'any');

  return (
    <>
      <div className="mt-8 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="py-2 pr-4 font-medium">Etiqueta</th>
              <th className="py-2 pr-4 font-medium">Vertical</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 pr-4 font-medium">Uso</th>
              <th className="py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <AdminContentTagRow
                key={item.id}
                item={item}
                isEditing={editingId === item.id}
                editName={editName}
                editDescription={editDescription}
                editScope={editScope}
                isMutating={isMutating}
                scopeOptions={scopeOptions}
                onStartEdit={() => {
                  setEditingId(item.id);
                  setEditName(item.name);
                  setEditDescription(item.description ?? '');
                  setEditScope(item.categoryScope ?? 'all');
                }}
                onCancelEdit={() => setEditingId(null)}
                onEditName={setEditName}
                onEditDescription={setEditDescription}
                onEditScope={setEditScope}
                onSave={() => {
                  onSave(item.id, {
                    name: editName.trim(),
                    description: editDescription.trim() || null,
                    categoryScope: editScope === 'all' ? 'all' : editScope,
                  });
                  setEditingId(null);
                }}
                onArchive={() => onArchive(item)}
                onRestore={() => onRestore(item)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-8 space-y-3 md:hidden">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-border/80 bg-bg-muted/40 p-4"
          >
            <p className="font-medium text-accent">{formatContentTagHashtag(item.name)}</p>
            <p className="mt-1 text-xs text-text-muted">
              {contentTagScopeLabel(item.categoryScope)} ·{' '}
              {item.isActive ? 'Activa' : 'Archivada'}
              {item.usageCount != null ? ` · ${item.usageCount} publicaciones` : ''}
            </p>
            {item.description ? (
              <p className="mt-2 text-sm text-text-muted">{item.description}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {item.isActive ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isMutating}
                  onClick={() => onArchive(item)}
                >
                  Archivar
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isMutating}
                  onClick={() => onRestore(item)}
                >
                  Restaurar
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

type RowProps = {
  item: ContentTagAdmin;
  isEditing: boolean;
  editName: string;
  editDescription: string;
  editScope: ContentTagScope | 'all';
  isMutating: boolean;
  scopeOptions: { value: ContentTagScope | 'any'; label: string }[];
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditName: (v: string) => void;
  onEditDescription: (v: string) => void;
  onEditScope: (v: ContentTagScope | 'all') => void;
  onSave: () => void;
  onArchive: () => void;
  onRestore: () => void;
};

function AdminContentTagRow({
  item,
  isEditing,
  editName,
  editDescription,
  editScope,
  isMutating,
  scopeOptions,
  onStartEdit,
  onCancelEdit,
  onEditName,
  onEditDescription,
  onEditScope,
  onSave,
  onArchive,
  onRestore,
}: RowProps) {
  if (isEditing) {
    return (
      <tr className="border-b border-border/60">
        <td colSpan={5} className="py-3">
          <div className="flex flex-wrap items-end gap-2">
            <Input label="Nombre" value={editName} onChange={(e) => onEditName(e.target.value)} />
            <select
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              value={editScope}
              onChange={(e) => onEditScope(e.target.value as ContentTagScope | 'all')}
              aria-label="Vertical"
            >
              {scopeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Input
              label="Descripción"
              value={editDescription}
              onChange={(e) => onEditDescription(e.target.value)}
            />
            <Button type="button" size="sm" disabled={isMutating || !editName.trim()} onClick={onSave}>
              Guardar
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onCancelEdit}>
              Cancelar
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border/60">
      <td className="py-3 pr-4">
        <span className="font-medium text-accent">{formatContentTagHashtag(item.name)}</span>
        <span className="ml-2 text-xs text-text-muted">/{item.slug}</span>
        {item.description ? (
          <p className="mt-1 text-xs text-text-muted">{item.description}</p>
        ) : null}
      </td>
      <td className="py-3 pr-4 text-text-muted">{contentTagScopeLabel(item.categoryScope)}</td>
      <td className="py-3 pr-4">{item.isActive ? 'Activa' : 'Archivada'}</td>
      <td className="py-3 pr-4 text-text-muted">{item.usageCount ?? 0}</td>
      <td className="py-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={isMutating} onClick={onStartEdit}>
            Editar
          </Button>
          {item.isActive ? (
            <Button type="button" size="sm" variant="secondary" disabled={isMutating} onClick={onArchive}>
              Archivar
            </Button>
          ) : (
            <Button type="button" size="sm" variant="secondary" disabled={isMutating} onClick={onRestore}>
              Restaurar
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
