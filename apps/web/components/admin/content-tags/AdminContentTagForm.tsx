'use client';

import { Button, Input, Select } from '@/components';
import { CONTENT_TAG_SCOPE_OPTIONS } from '@/lib/admin/content-tag-scope-labels';
import type { ContentTagScope } from '@/repositories/interfaces';

type AdminContentTagFormProps = {
  name: string;
  description: string;
  categoryScope: ContentTagScope | 'all';
  isPending: boolean;
  errorMessage?: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryScopeChange: (value: ContentTagScope | 'all') => void;
  onSubmit: () => void;
};

export function AdminContentTagForm({
  name,
  description,
  categoryScope,
  isPending,
  errorMessage,
  onNameChange,
  onDescriptionChange,
  onCategoryScopeChange,
  onSubmit,
}: AdminContentTagFormProps) {
  const scopeOptions = CONTENT_TAG_SCOPE_OPTIONS.filter((o) => o.value !== 'any');

  return (
    <form
      className="mt-8 rounded-xl border border-border/80 bg-bg-muted/30 p-4 md:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <p className="text-sm font-medium text-text">Nueva etiqueta</p>
      <p className="mt-1 text-xs text-text-muted">
        Se guarda sin #; en la app se muestra como hashtag (ej. nieve → #nieve).
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nieve"
          required
        />
        <Select
          label="Vertical"
          value={categoryScope}
          options={scopeOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
          onChange={(e) => onCategoryScopeChange(e.target.value as ContentTagScope | 'all')}
        />
        <Input
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="md:col-span-2"
        />
      </div>
      {errorMessage ? <p className="mt-3 text-sm text-danger">{errorMessage}</p> : null}
      <Button type="submit" className="mt-4" disabled={isPending || !name.trim()}>
        {isPending ? 'Creando…' : 'Crear etiqueta'}
      </Button>
    </form>
  );
}
