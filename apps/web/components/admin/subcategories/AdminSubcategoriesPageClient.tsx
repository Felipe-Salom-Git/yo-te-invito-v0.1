'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageContainer,
  SectionTitle,
  QueryError,
  useToast,
} from '@/components';
import { AdminCategoryBannerPanel } from '@/components/categories/AdminCategoryBannerPanel';
import { AdminCategoryEditorialBannerPanel } from '@/components/categories/AdminCategoryEditorialBannerPanel';
import { useAdminSubcategories } from '@/lib/query/subcategories';
import { isManageableSubcategoryCategory } from '@/lib/admin/admin-subcategory-categories';
import { useRepositories } from '@/repositories/context';
import { subcategoriesKeys } from '@/lib/query/keys';
import type { ContentCategory, ContentMainCategory } from '@/repositories/interfaces';
import { getErrorMessage } from '@/lib/errors';
import { AdminSubcategoryCategoryTabs } from './AdminSubcategoryCategoryTabs';
import { AdminHotelComingSoonPanel } from './AdminHotelComingSoonPanel';
import { AdminSubcategoryForm } from './AdminSubcategoryForm';
import { AdminSubcategoryList } from './AdminSubcategoryList';

type AdminSection = 'subcategories' | 'banner';

export function AdminSubcategoriesPageClient() {
  const [tab, setTab] = useState<ContentCategory>('event');
  const [section, setSection] = useState<AdminSection>('subcategories');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const repos = useRepositories();
  const qc = useQueryClient();
  const { addToast } = useToast();
  const manageable = isManageableSubcategoryCategory(tab);

  const listQuery = useAdminSubcategories(tab);
  const items = listQuery.data?.data ?? [];
  const comingSoon = listQuery.data?.comingSoon === true || tab === 'hotel';

  const invalidate = () => qc.invalidateQueries({ queryKey: subcategoriesKeys.admin(tab) });

  const createMutation = useMutation({
    mutationFn: () =>
      repos.subcategories.create({
        category: tab as ContentMainCategory,
        name: name.trim(),
        description: description.trim() || null,
        sortOrder: parseInt(sortOrder, 10) || 0,
        isActive: true,
      }),
    onSuccess: () => {
      setName('');
      setDescription('');
      setSortOrder('0');
      addToast('Subcategoría creada', 'success');
      invalidate();
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive
        ? repos.subcategories.deactivate(id)
        : repos.subcategories.update(id, { isActive: true }),
    onSuccess: () => {
      addToast('Estado actualizado', 'success');
      invalidate();
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; sortOrder?: number; name?: string }) =>
      repos.subcategories.update(payload.id, {
        ...(payload.sortOrder !== undefined && { sortOrder: payload.sortOrder }),
        ...(payload.name !== undefined && { name: payload.name }),
      }),
    onSuccess: () => {
      addToast('Subcategoría actualizada', 'success');
      invalidate();
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const isMutating =
    createMutation.isPending || toggleMutation.isPending || updateMutation.isPending;

  const handleTabChange = (category: ContentCategory) => {
    setTab(category);
    if (category === 'hotel') setSection('subcategories');
  };

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Administración
      </Link>
      <SectionTitle>Subcategorías</SectionTitle>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Estructura por vertical para filtros en explore, landings y formularios de carga. Solo las
        subcategorías activas aparecen en la app pública.
      </p>

      <div className="mt-6">
        <AdminSubcategoryCategoryTabs active={tab} onChange={handleTabChange} />
      </div>

      {comingSoon ? (
        <AdminHotelComingSoonPanel />
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSection('subcategories')}
              className={`rounded-lg px-3 py-2 text-sm ${
                section === 'subcategories'
                  ? 'border border-accent text-accent'
                  : 'border border-border text-text-muted hover:text-text'
              }`}
            >
              Subcategorías
            </button>
            <button
              type="button"
              onClick={() => setSection('banner')}
              className={`rounded-lg px-3 py-2 text-sm ${
                section === 'banner'
                  ? 'border border-accent text-accent'
                  : 'border border-border text-text-muted hover:text-text'
              }`}
            >
              Banner de categoría
            </button>
          </div>

          {listQuery.isError ? (
            <QueryError
              className="mt-6"
              message={getErrorMessage(listQuery.error)}
              onRetry={() => listQuery.refetch()}
            />
          ) : null}

          {section === 'banner' && manageable ? (
            <>
              <AdminCategoryEditorialBannerPanel category={tab as ContentMainCategory} />
              <div className="mt-10 border-t border-border pt-8">
                <p className="text-sm font-medium text-text">Eventos destacados (fallback)</p>
                <p className="mt-1 text-xs text-text-muted">
                  Solo aplica cuando no hay banners editoriales activos en la landing pública.
                </p>
                <AdminCategoryBannerPanel category={tab as ContentMainCategory} />
              </div>
            </>
          ) : (
            <>
              <AdminSubcategoryForm
                name={name}
                description={description}
                sortOrder={sortOrder}
                isPending={createMutation.isPending}
                errorMessage={
                  createMutation.isError ? getErrorMessage(createMutation.error) : undefined
                }
                onNameChange={setName}
                onDescriptionChange={setDescription}
                onSortOrderChange={setSortOrder}
                onSubmit={() => createMutation.mutate()}
              />
              <AdminSubcategoryList
                items={items}
                isLoading={listQuery.isLoading}
                isMutating={isMutating}
                onMoveUp={(item) =>
                  updateMutation.mutate({
                    id: item.id,
                    sortOrder: Math.max(0, item.sortOrder - 1),
                  })
                }
                onMoveDown={(item) =>
                  updateMutation.mutate({ id: item.id, sortOrder: item.sortOrder + 1 })
                }
                onToggleActive={(item) =>
                  toggleMutation.mutate({ id: item.id, isActive: item.isActive })
                }
                onSaveName={(id, newName) => updateMutation.mutate({ id, name: newName })}
              />
            </>
          )}
        </>
      )}
    </PageContainer>
  );
}
