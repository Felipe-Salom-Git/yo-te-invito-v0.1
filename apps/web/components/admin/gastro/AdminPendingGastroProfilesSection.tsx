'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, QueryError, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { PendingGastroProfile } from '@/repositories/interfaces';
import {
  useAdminApproveGastroProfileMutation,
  useAdminPendingGastroProfiles,
  useAdminRejectGastroProfileMutation,
} from '@/lib/query/admin-gastro';

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function locationLine(p: PendingGastroProfile): string {
  const parts = [p.city, p.province].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

export function AdminPendingGastroProfilesSection() {
  const { addToast } = useToast();
  const pendingQuery = useAdminPendingGastroProfiles();
  const approveMutation = useAdminApproveGastroProfileMutation();
  const rejectMutation = useAdminRejectGastroProfileMutation();
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);

  const profiles = pendingQuery.data?.profiles ?? [];
  const busy =
    approveMutation.isPending || rejectMutation.isPending;

  const handleApprove = (profile: PendingGastroProfile) => {
    const ok = window.confirm(`¿Aprobar el local «${profile.displayName}»?`);
    if (!ok) return;
    setActionTargetId(profile.id);
    approveMutation.mutate(profile.id, {
      onSuccess: () => addToast('Local gastronómico aprobado', 'success'),
      onError: (err) => addToast(getErrorMessage(err), 'error'),
      onSettled: () => setActionTargetId(null),
    });
  };

  const handleReject = (profile: PendingGastroProfile) => {
    const reason = window.prompt('Motivo del rechazo (opcional):');
    if (reason === null) return;
    const ok = window.confirm(
      `¿Rechazar el local «${profile.displayName}»?`,
    );
    if (!ok) return;
    setActionTargetId(profile.id);
    rejectMutation.mutate(
      { profileId: profile.id, reason: reason.trim() || null },
      {
        onSuccess: () => addToast('Local gastronómico rechazado', 'success'),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
        onSettled: () => setActionTargetId(null),
      },
    );
  };

  return (
    <section
      className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 sm:p-5"
      aria-labelledby="pending-gastro-profiles-title"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="pending-gastro-profiles-title"
          className="text-base font-semibold text-text"
        >
          Locales gastronómicos pendientes
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {!pendingQuery.isLoading && !pendingQuery.isError ? (
            <span className="text-sm tabular-nums text-text-muted">
              {profiles.length} pendiente{profiles.length === 1 ? '' : 's'}
            </span>
          ) : null}
          <Link
            href="/admin/gastronomicos"
            className="text-sm font-medium text-accent hover:underline"
          >
            Ver pendientes →
          </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-text-muted">
        Locales creados por cuentas gastronomómicas que requieren aprobación admin
        antes de publicarse. No confundir con descuentos pendientes de revisión.
      </p>

      {pendingQuery.isLoading ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-border/60 bg-bg-muted/40"
            />
          ))}
        </div>
      ) : pendingQuery.isError ? (
        <QueryError
          className="mt-4"
          message={getErrorMessage(pendingQuery.error)}
          onRetry={() => pendingQuery.refetch()}
        />
      ) : profiles.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">
          No hay locales esperando aprobación.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border/60 rounded-lg border border-border/80 bg-bg-muted/30">
          {profiles.map((profile) => {
            const rowBusy = busy && actionTargetId === profile.id;
            return (
              <li
                key={profile.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-text">{profile.displayName}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    Pendiente · {locationLine(profile)}
                    {profile.address ? ` · ${profile.address}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Creado {formatCreatedAt(profile.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/admin/gastronomicos/${profile.id}`}>
                    <Button type="button" variant="outline" size="sm" disabled={rowBusy}>
                      Revisar
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    disabled={rowBusy}
                    onClick={() => handleApprove(profile)}
                  >
                    {rowBusy && approveMutation.isPending ? 'Aprobando…' : 'Aprobar'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={rowBusy}
                    onClick={() => handleReject(profile)}
                  >
                    {rowBusy && rejectMutation.isPending ? 'Rechazando…' : 'Rechazar'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
