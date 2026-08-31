'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components';
import type { AdminDeepDeletePreflight } from '@yo-te-invito/shared';

const CONFIRM_WORD = 'ELIMINAR';

type Props = {
  open: boolean;
  entityLabel: string;
  preflight: AdminDeepDeletePreflight | null;
  isPreflightLoading?: boolean;
  isDeleting?: boolean;
  deleteError?: string | null;
  onClose: () => void;
  onConfirm: (payload: {
    force: boolean;
    confirmationText: string;
    acknowledgedCriticalHistory: boolean;
  }) => void;
};

const severityClass: Record<string, string> = {
  info: 'text-text-muted',
  warning: 'text-amber-300',
  critical: 'text-red-400',
  blocker: 'text-red-500 font-semibold',
};

function groupLabel(action: string): string {
  const map: Record<string, string> = {
    delete: 'Se eliminarán',
    soft_delete: 'Se desactivarán / ocultarán',
    keep: 'Se conservará historial crítico',
    block: 'Bloqueos de política',
    detach: 'Se anonimizará',
  };
  return map[action] ?? action;
}

export function AdminDeepDeleteModal({
  open,
  entityLabel,
  preflight,
  isPreflightLoading,
  isDeleting,
  deleteError,
  onClose,
  onConfirm,
}: Props) {
  const [understood, setUnderstood] = useState(false);
  const [ackCritical, setAckCritical] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!open) {
      setUnderstood(false);
      setAckCritical(false);
      setConfirmText('');
    }
  }, [open]);

  const grouped = useMemo(() => {
    if (!preflight) return [];
    const order = ['delete', 'soft_delete', 'detach', 'keep', 'block'] as const;
    return order
      .map((action) => ({
        action,
        label: groupLabel(action),
        items: preflight.impacts.filter((i) => i.action === action && i.count > 0),
      }))
      .filter((g) => g.items.length > 0);
  }, [preflight]);

  if (!open) return null;

  const policyBlocked = preflight != null && !preflight.canDelete;
  const canConfirm =
    preflight?.canDelete === true &&
    understood &&
    confirmText.trim().toUpperCase() === CONFIRM_WORD &&
    (!preflight.requiresExtraConfirmation || ackCritical);

  const handleClose = () => {
    setUnderstood(false);
    setAckCritical(false);
    setConfirmText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-bg p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        {isPreflightLoading ? (
          <>
            <h3 className="text-lg font-semibold text-text">Analizando impacto…</h3>
            <p className="mt-2 text-sm text-text-muted">
              Calculando qué se eliminará o conservará para «{entityLabel}».
            </p>
          </>
        ) : policyBlocked ? (
          <>
            <h3 className="text-lg font-semibold text-text">No se puede eliminar</h3>
            <p className="mt-2 text-sm text-text-muted">
              Hay restricciones de política que impiden esta eliminación.
            </p>
            <ul className="mt-4 space-y-2 rounded-lg border border-red-900/40 bg-red-900/15 p-3">
              {preflight?.impacts
                .filter((i) => i.severity === 'blocker')
                .map((i) => (
                  <li key={i.type} className="text-sm text-red-200">
                    {i.label}: {i.description ?? i.count}
                  </li>
                ))}
            </ul>
            <div className="mt-6 flex justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-text">Eliminar definitivamente</h3>
            <p className="mt-2 text-sm text-text-muted">
              Vas a eliminar <span className="font-medium text-text">«{entityLabel}»</span> y
              contenido relacionado.
            </p>

            {preflight ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded border border-border px-2 py-1.5">
                    <p className="text-text-muted">Eliminar</p>
                    <p className="font-semibold text-text">{preflight.summary.deleteCount}</p>
                  </div>
                  <div className="rounded border border-border px-2 py-1.5">
                    <p className="text-text-muted">Desactivar</p>
                    <p className="font-semibold text-text">{preflight.summary.softDeleteCount}</p>
                  </div>
                  <div className="rounded border border-border px-2 py-1.5">
                    <p className="text-text-muted">Crítico</p>
                    <p className="font-semibold text-red-400">{preflight.summary.criticalCount}</p>
                  </div>
                  <div className="rounded border border-border px-2 py-1.5">
                    <p className="text-text-muted">Bloqueos</p>
                    <p className="font-semibold text-text">{preflight.summary.blockerCount}</p>
                  </div>
                </div>

                {grouped.map((group) => (
                  <section key={group.action}>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      {group.label}
                    </h4>
                    <ul className="mt-2 space-y-1">
                      {group.items.map((item) => (
                        <li key={item.type} className={`text-sm ${severityClass[item.severity]}`}>
                          {item.label}: <span className="font-medium">{item.count}</span>
                          {item.adminPath ? (
                            <>
                              {' '}
                              ·{' '}
                              <Link href={item.adminPath} className="text-accent hover:underline">
                                Ver
                              </Link>
                            </>
                          ) : null}
                          {item.description ? (
                            <span className="block text-xs opacity-80">{item.description}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : null}

            <p className="mt-4 text-sm text-amber-200/90">
              Esta acción es irreversible para los datos eliminados. El historial crítico se
              conservará para auditoría.
            </p>

            {deleteError ? (
              <p className="mt-3 rounded-lg border border-red-900/50 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                {deleteError}
              </p>
            ) : null}

            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="mt-0.5"
                />
                <span>Entiendo el impacto de esta acción.</span>
              </label>
              {preflight?.requiresExtraConfirmation ? (
                <label className="flex cursor-pointer items-start gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={ackCritical}
                    onChange={(e) => setAckCritical(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>Entiendo que existe historial crítico asociado.</span>
                </label>
              ) : null}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text">
                  Escribí {CONFIRM_WORD} para confirmar
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded border border-border bg-bg-muted px-3 py-2 text-text"
                  placeholder={CONFIRM_WORD}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-red-700 text-white hover:bg-red-600"
                disabled={!canConfirm || isDeleting}
                onClick={() =>
                  onConfirm({
                    force: preflight?.requiresForce ?? false,
                    confirmationText: confirmText.trim(),
                    acknowledgedCriticalHistory: ackCritical,
                  })
                }
              >
                {isDeleting ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
