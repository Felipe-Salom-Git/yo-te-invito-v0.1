'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AdminGastroLocationStatusInput } from '@yo-te-invito/shared';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  QueryError,
  Button,
  Input,
  useToast,
} from '@/components';
import { GastroLocalForm } from '@/components/gastro/GastroLocalForm';
import { AdminProducerStatusBadge } from '@/components/admin/producers/AdminProducerStatusBadge';
import { getErrorMessage } from '@/lib/errors';
import {
  gastroPayloadToAdminCreate,
  gastroPayloadToAdminUpdate,
  mapAdminGastroDetailToGastroLocal,
} from '@/lib/admin/admin-gastro-form.utils';
import {
  useAdminGastroLocationDetail,
  useAdminGastroLocationCreateMutation,
  useAdminGastroLocationUpdateMutation,
} from '@/lib/query/admin-gastro';
import { useAdminSubcategories } from '@/lib/query/subcategories';
import type { GastroLocalUpsertPayload } from '@/repositories/interfaces';

const STATUS_CREATE_OPTIONS: { value: AdminGastroLocationStatusInput; label: string }[] = [
  { value: 'ACTIVE', label: 'Activo (visible si publicás)' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'SUSPENDED', label: 'Suspendido' },
];

type Props = {
  mode: 'create' | 'edit';
  profileId?: string;
};

export function AdminGastroLocationFormClient({ mode, profileId }: Props) {
  const router = useRouter();
  const { addToast } = useToast();
  const isCreate = mode === 'create';

  const detailQuery = useAdminGastroLocationDetail(profileId ?? '', !isCreate && !!profileId);
  const subcategoriesQuery = useAdminSubcategories('gastro');
  const createMutation = useAdminGastroLocationCreateMutation();
  const updateMutation = useAdminGastroLocationUpdateMutation();

  const [legalName, setLegalName] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [status, setStatus] = useState<AdminGastroLocationStatusInput>('ACTIVE');
  const [publish, setPublish] = useState(true);
  const [adminHydrated, setAdminHydrated] = useState(false);

  const location = detailQuery.data;
  const subcategories = (subcategoriesQuery.data?.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  useEffect(() => {
    if (isCreate || !location || adminHydrated) return;
    setLegalName(location.legalName ?? '');
    setOwnerUserId(location.owner.userId ?? '');
    setAdminHydrated(true);
  }, [isCreate, location, adminHydrated]);

  const initialLocal =
    !isCreate && location ? mapAdminGastroDetailToGastroLocal(location) : null;

  const submitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (payload: GastroLocalUpsertPayload) => {
    const ownerTrim = ownerUserId.trim();
    const legalTrim = legalName.trim() || null;

    if (isCreate) {
      createMutation.mutate(
        gastroPayloadToAdminCreate(payload, {
          legalName: legalTrim,
          ownerUserId: ownerTrim || null,
          status,
          publish,
        }),
        {
          onError: (err) => addToast(getErrorMessage(err), 'error'),
          onSuccess: (created) => {
            addToast('Local gastronómico creado', 'success');
            router.push(`/admin/gastronomicos/${created.id}/editar`);
          },
        },
      );
      return;
    }

    if (!profileId) return;
    updateMutation.mutate(
      {
        profileId,
        body: gastroPayloadToAdminUpdate(payload, {
          legalName: legalTrim,
          ownerUserId: ownerTrim || null,
        }),
      },
      {
        onError: (err) => addToast(getErrorMessage(err), 'error'),
        onSuccess: () => {
          addToast('Local actualizado', 'success');
          router.push(`/admin/gastronomicos/${profileId}`);
        },
      },
    );
  };

  if (!isCreate && detailQuery.isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando local…" />
      </PageContainer>
    );
  }

  if (!isCreate && detailQuery.isError) {
    return (
      <PageContainer>
        <QueryError
          message={getErrorMessage(detailQuery.error)}
          onRetry={() => detailQuery.refetch()}
        />
      </PageContainer>
    );
  }

  if (!isCreate && !location) {
    return (
      <PageContainer>
        <p className="text-text-muted">Local no encontrado.</p>
        <Link href="/admin/gastronomicos" className="mt-4 inline-block text-accent hover:underline">
          Volver al listado
        </Link>
      </PageContainer>
    );
  }

  const imagesHelperText = isCreate
    ? 'Sin ID de local aún: podés pegar URLs https. Tras guardar podrás subir archivos a GCS en esta misma pantalla.'
    : undefined;

  return (
    <PageContainer>
      <Link
        href="/admin/gastronomicos"
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Locales gastronómicos
      </Link>

      <header className="mb-6">
        <SectionTitle>
          {isCreate ? 'Nuevo local gastronómico' : `Editar: ${location?.displayName}`}
        </SectionTitle>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          {isCreate
            ? 'Alta operativa desde administración. El dueño es opcional; sin dueño el local queda gestionado solo por admin.'
            : 'Los cambios en datos públicos se sincronizan con la ficha en Gastronomía cuando el local está activo.'}
        </p>
      </header>

      <div className="max-w-2xl space-y-8">
        {isCreate ? (
          <section className="rounded-xl border border-border/80 bg-bg-muted/30 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-text">Administración</h2>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Estado inicial</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as AdminGastroLocationStatusInput)
                }
                className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text"
              >
                {STATUS_CREATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-start gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                className="mt-1 rounded border-border"
              />
              <span>
                Publicar ahora en Gastronomía
                <span className="mt-1 block text-xs text-text-muted">
                  Si está activo y marcás publicar, se crea o actualiza la ficha visible en
                  descubrimiento. Si lo desmarcás, el local queda guardado para gestión interna.
                </span>
              </span>
            </label>
            <Input
              label="ID de usuario dueño (opcional)"
              value={ownerUserId}
              onChange={(e) => setOwnerUserId(e.target.value)}
              placeholder="cuid del usuario"
            />
            <p className="text-xs text-text-muted">
              Opcional. Si se informa, el usuario quedará asociado como dueño y podrá operar desde
              el portal /gastro.
            </p>
          </section>
        ) : (
          <section className="rounded-xl border border-border/80 bg-bg-muted/30 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-text">Administración</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-text-muted">Estado actual:</span>
              {location ? <AdminProducerStatusBadge status={location.status} /> : null}
            </div>
            <p className="text-xs text-text-muted">
              Para suspender o reactivar usá la acción en el{' '}
              <Link href="/admin/gastronomicos" className="text-accent hover:underline">
                listado de locales
              </Link>
              .
            </p>
            <Input
              label="ID de usuario dueño (opcional)"
              value={ownerUserId}
              onChange={(e) => setOwnerUserId(e.target.value)}
              placeholder="cuid del usuario"
            />
            {location?.owner.email ? (
              <p className="text-xs text-text-muted">
                Dueño actual: {location.owner.name ?? location.owner.email} ({location.owner.email})
              </p>
            ) : (
              <p className="text-xs text-text-muted">Sin dueño asignado (operado por admin).</p>
            )}
          </section>
        )}

        <GastroLocalForm
          key={initialLocal?.id ?? 'create'}
          mode="admin"
          initial={initialLocal}
          subcategories={subcategories}
          gastroProfileId={isCreate ? undefined : profileId}
          requireSubcategory={subcategories.length > 0}
          imagesHelperText={imagesHelperText}
          legalName={legalName}
          onLegalNameChange={setLegalName}
          submitting={submitting}
          submitLabel={isCreate ? 'Crear local' : 'Guardar cambios'}
          onSubmit={handleSubmit}
        />

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/gastronomicos">
            <Button type="button" variant="outline">
              Volver al listado
            </Button>
          </Link>
          {!isCreate && profileId ? (
            <Link href={`/admin/gastronomicos/${profileId}`}>
              <Button type="button" variant="ghost">
                Ver detalle y descuentos
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
