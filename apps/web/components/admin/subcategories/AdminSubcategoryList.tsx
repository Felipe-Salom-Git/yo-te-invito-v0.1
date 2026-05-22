'use client';

import { useState } from 'react';
import { Button, Input, EmptyState } from '@/components';
import type { SubcategoryAdmin } from '@/repositories/interfaces';

type AdminSubcategoryListProps = {
  items: SubcategoryAdmin[];
  isLoading: boolean;
  isMutating: boolean;
  onMoveUp: (item: SubcategoryAdmin) => void;
  onMoveDown: (item: SubcategoryAdmin) => void;
  onToggleActive: (item: SubcategoryAdmin) => void;
  onSaveName: (id: string, name: string) => void;
};

export function AdminSubcategoryList({
  items,
  isLoading,
  isMutating,
  onMoveUp,
  onMoveDown,
  onToggleActive,
  onSaveName,
}: AdminSubcategoryListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
        title="Sin subcategorías"
        description="Creá la primera subcategoría con el formulario de arriba. Solo las activas aparecen en la app pública."
      />
    );
  }

  return (
    <ul className="mt-8 space-y-3">
      {items.map((item) => {
        const isEditing = editingId === item.id;
        return (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-bg-muted/40 p-4"
          >
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="flex flex-wrap items-end gap-2">
                  <Input
                    label="Nombre"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-w-[200px] flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isMutating || !editName.trim()}
                    onClick={() => {
                      onSaveName(item.id, editName.trim());
                      setEditingId(null);
                    }}
                  >
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <>
                  <p className="font-medium text-text">
                    {item.name}{' '}
                    <span className="text-xs font-normal text-text-muted">/{item.slug}</span>
                  </p>
                  {item.description ? (
                    <p className="mt-1 text-sm text-text-muted">{item.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-text-muted">
                    {item.isActive ? 'Activa' : 'Inactiva'} · orden {item.sortOrder}
                  </p>
                </>
              )}
            </div>
            {!isEditing ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => onMoveUp(item)}
                  aria-label={`Subir ${item.name}`}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => onMoveDown(item)}
                  aria-label={`Bajar ${item.name}`}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => {
                    setEditingId(item.id);
                    setEditName(item.name);
                  }}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => onToggleActive(item)}
                >
                  {item.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
