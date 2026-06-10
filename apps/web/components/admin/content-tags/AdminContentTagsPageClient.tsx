'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  PageContainer,
  SectionTitle,
  QueryError,
  Input,
  Select,
  useToast,
} from '@/components';
import {
  useAdminContentTags,
  useAdminContentTagsMutations,
} from '@/lib/query/content-tags';
import { CONTENT_TAG_SCOPE_OPTIONS } from '@/lib/admin/content-tag-scope-labels';
import type { ContentTagScope } from '@/repositories/interfaces';
import { getErrorMessage } from '@/lib/errors';
import { AdminContentTagForm } from './AdminContentTagForm';
import { AdminContentTagList } from './AdminContentTagList';

type ScopeFilter = ContentTagScope | 'any';
type StatusFilter = 'all' | 'active' | 'archived';

export function AdminContentTagsPageClient() {
  const [q, setQ] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('any');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryScope, setCategoryScope] = useState<ContentTagScope | 'all'>('all');
  const { addToast } = useToast();

  const listParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      categoryScope: scopeFilter === 'any' ? undefined : scopeFilter,
      isActive:
        statusFilter === 'all' ? undefined : statusFilter === 'active' ? true : false,
      page: 1,
      limit: 100,
    }),
    [q, scopeFilter, statusFilter],
  );

  const listQuery = useAdminContentTags(listParams);
  const { create, update, archive, restore } = useAdminContentTagsMutations(listParams);
  const items = listQuery.data?.data ?? [];

  const isMutating =
    create.isPending || update.isPending || archive.isPending || restore.isPending;

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Administración
      </Link>
      <SectionTitle>Etiquetas</SectionTitle>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Etiquetas de publicaciones para mejorar búsqueda en Explorar. Complementan categorías y
        subcategorías; no las reemplazan.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Input
          label="Buscar"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre o slug"
          className="min-w-[200px] flex-1"
        />
        <Select
          label="Vertical"
          value={scopeFilter}
          options={CONTENT_TAG_SCOPE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
        />
        <Select
          label="Estado"
          value={statusFilter}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'active', label: 'Activas' },
            { value: 'archived', label: 'Archivadas' },
          ]}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        />
      </div>

      <AdminContentTagForm
        name={name}
        description={description}
        categoryScope={categoryScope}
        isPending={create.isPending}
        errorMessage={create.isError ? getErrorMessage(create.error) : undefined}
        onNameChange={setName}
        onDescriptionChange={setDescription}
        onCategoryScopeChange={setCategoryScope}
        onSubmit={() =>
          create.mutate(
            {
              name: name.trim(),
              description: description.trim() || null,
              categoryScope,
            },
            {
              onSuccess: () => {
                setName('');
                setDescription('');
                setCategoryScope('all');
                addToast('Etiqueta creada', 'success');
              },
              onError: (err) => addToast(getErrorMessage(err), 'error'),
            },
          )
        }
      />

      {listQuery.isError ? (
        <QueryError
          className="mt-6"
          message={getErrorMessage(listQuery.error)}
          onRetry={() => listQuery.refetch()}
        />
      ) : null}

      <AdminContentTagList
        items={items}
        isLoading={listQuery.isLoading}
        isMutating={isMutating}
        onSave={(id, patch) =>
          update.mutate(
            { id, patch },
            {
              onSuccess: () => addToast('Etiqueta actualizada', 'success'),
              onError: (err) => addToast(getErrorMessage(err), 'error'),
            },
          )
        }
        onArchive={(item) => {
          if (
            !window.confirm(
              `¿Archivar ${item.name}? Dejará de aparecer en formularios y búsqueda pública.`,
            )
          ) {
            return;
          }
          archive.mutate(item.id, {
            onSuccess: () => addToast('Etiqueta archivada', 'success'),
            onError: (err) => addToast(getErrorMessage(err), 'error'),
          });
        }}
        onRestore={(item) => {
          restore.mutate(item.id, {
            onSuccess: () => addToast('Etiqueta restaurada', 'success'),
            onError: (err) => addToast(getErrorMessage(err), 'error'),
          });
        }}
      />
    </PageContainer>
  );
}
