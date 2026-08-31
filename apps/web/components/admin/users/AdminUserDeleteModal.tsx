'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components';
import type { AdminUserDeletePreflight } from '@/repositories/interfaces';

const CONFIRM_WORD = 'ELIMINAR';

type AdminUserDeleteModalProps = {
  open: boolean;
  userEmail: string;
  preflight: AdminUserDeletePreflight | null;
  isPreflightLoading?: boolean;
  isDeleting?: boolean;
  deleteError?: string | null;
  onClose: () => void;
  onConfirmDelete: () => void;
};

function BlockerLabel({ blocker }: { blocker: AdminUserDeletePreflight['blockers'][number] }) {
  const typeLabels: Record<string, string> = {
    EVENTS: 'Eventos publicados',
    GASTRO_DISCOUNTS: 'Descuentos gastronómicos',
    GASTRO_CONTENT: 'Contenido gastronómico',
    GASTRO_PUBLIC_EVENT: 'Publicación gastronómica',
    HOTEL_PUBLIC_EVENT: 'Publicación hotel',
    ORDERS: 'Órdenes',
    TICKETS: 'Entradas',
    PAYMENTS: 'Pagos',
    REVIEWS: 'Reseñas',
    SCANNER_ACCOUNTS: 'Cuentas scanner',
    PROTECTED_MASTER: 'Cuenta maestro',
    SELF_DELETE: 'Auto-eliminación',
    LAST_ADMIN: 'Último administrador',
  };
  const label = typeLabels[blocker.type] ?? blocker.type;
  return (
    <li className="text-sm text-text">
      <span className="font-medium">{label}:</span> {blocker.count}
      {blocker.adminPath ? (
        <>
          {' '}
          ·{' '}
          <Link href={blocker.adminPath} className="text-accent hover:underline">
            Ver detalle
          </Link>
        </>
      ) : null}
    </li>
  );
}

export function AdminUserDeleteModal({
  open,
  userEmail,
  preflight,
  isPreflightLoading,
  isDeleting,
  deleteError,
  onClose,
  onConfirmDelete,
}: AdminUserDeleteModalProps) {
  const [understood, setUnderstood] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!open) {
      setUnderstood(false);
      setConfirmText('');
    }
  }, [open]);

  if (!open) return null;

  const blocked = preflight != null && !preflight.canDelete;
  const canConfirmDelete =
    preflight?.canDelete === true &&
    understood &&
    confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const handleClose = () => {
    setUnderstood(false);
    setConfirmText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-bg p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-delete-title"
      >
        {isPreflightLoading ? (
          <>
            <h3 id="admin-user-delete-title" className="text-lg font-semibold text-text">
              Verificando usuario…
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              Revisando publicaciones e historial asociado a {userEmail}.
            </p>
          </>
        ) : blocked ? (
          <>
            <h3 id="admin-user-delete-title" className="text-lg font-semibold text-text">
              No se puede eliminar este usuario
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              Este usuario tiene publicaciones o historial asociado. Primero eliminá o archivá sus
              publicaciones.
            </p>
            {preflight.blockers.length > 0 ? (
              <ul className="mt-4 space-y-2 rounded-lg border border-amber-800/40 bg-amber-900/15 p-3">
                {preflight.blockers.map((b) => (
                  <BlockerLabel key={`${b.type}-${b.message}`} blocker={b} />
                ))}
              </ul>
            ) : null}
            {preflight.blockers.some((b) => b.adminPath) ? (
              <p className="mt-3">
                <Link
                  href={preflight.blockers.find((b) => b.adminPath)?.adminPath ?? '/admin/eventos'}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Ver publicaciones
                </Link>
              </p>
            ) : null}
            <div className="mt-6 flex justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 id="admin-user-delete-title" className="text-lg font-semibold text-text">
              Eliminar usuario
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              Esta acción es irreversible. Se eliminará la cuenta de{' '}
              <span className="font-medium text-text">{userEmail}</span> y sus datos auxiliares sin
              historial crítico.
            </p>
            {preflight && preflight.warnings.length > 0 ? (
              <p className="mt-2 text-xs text-text-muted">
                También se eliminarán {preflight.warnings.length} tipo(s) de datos auxiliares (favoritos,
                notificaciones, etc.).
              </p>
            ) : null}
            {deleteError ? (
              <p className="mt-3 rounded-lg border border-red-900/50 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                {deleteError}
              </p>
            ) : null}
            <div className="mt-4 space-y-4">
              <label className="flex cursor-pointer items-start gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="mt-0.5"
                />
                <span>Entiendo que esta acción es irreversible.</span>
              </label>
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
                disabled={!canConfirmDelete || isDeleting}
                onClick={onConfirmDelete}
              >
                {isDeleting ? 'Eliminando…' : 'Eliminar usuario'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
