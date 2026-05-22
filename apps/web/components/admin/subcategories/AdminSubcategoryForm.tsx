'use client';

import { Button, Input } from '@/components';

type AdminSubcategoryFormProps = {
  name: string;
  description: string;
  sortOrder: string;
  isPending: boolean;
  errorMessage?: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
  onSubmit: () => void;
};

export function AdminSubcategoryForm({
  name,
  description,
  sortOrder,
  isPending,
  errorMessage,
  onNameChange,
  onDescriptionChange,
  onSortOrderChange,
  onSubmit,
}: AdminSubcategoryFormProps) {
  return (
    <form
      className="mt-8 grid gap-4 rounded-xl border border-border/80 bg-bg-muted/30 p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit();
      }}
    >
      <Input
        label="Nombre"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        required
        placeholder="Ej. Fiestas, Kayaks…"
      />
      <Input
        label="Orden"
        type="number"
        value={sortOrder}
        onChange={(e) => onSortOrderChange(e.target.value)}
        min={0}
      />
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-text">Descripción (opcional)</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text"
          rows={2}
          maxLength={500}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? 'Creando…' : 'Crear subcategoría'}
        </Button>
        {errorMessage ? (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </form>
  );
}
