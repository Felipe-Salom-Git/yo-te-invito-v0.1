'use client';

import { usePwaInstall } from '@/hooks/use-pwa-install';

export type ScannerMenuActions = {
  onScanFocus?: () => void;
  onSelectTarget?: () => void;
  onDownloadPdf?: () => void;
  onSaveOffline?: () => void;
  onSync?: () => void;
  onLogout: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  isOnline: boolean;
  userLabel: string;
  parentLabel: string | null;
  targetLabel: string | null;
  canDownloadPdf: boolean;
  canSaveOffline: boolean;
  canSync: boolean;
  syncing: boolean;
  actions: ScannerMenuActions;
};

export function ScannerOperationalMenu({
  open,
  onClose,
  isOnline,
  userLabel,
  parentLabel,
  targetLabel,
  canDownloadPdf,
  canSaveOffline,
  canSync,
  syncing,
  actions,
}: Props) {
  const { canInstall, isStandalone, install } = usePwaInstall();

  if (!open) return null;

  const itemClass =
    'w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Cerrar menú"
        onClick={onClose}
      />
      <aside className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-slate-900 shadow-xl">
        <div className="border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Menú scanner</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:text-white"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <div className="mt-3 space-y-1 text-xs text-slate-400">
            <p>
              <span className="text-slate-500">Estado:</span>{' '}
              <span className={isOnline ? 'text-emerald-400' : 'text-amber-400'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </p>
            <p>
              <span className="text-slate-500">Usuario:</span> {userLabel}
            </p>
            {parentLabel && (
              <p>
                <span className="text-slate-500">Cuenta:</span> {parentLabel}
              </p>
            )}
            {targetLabel && (
              <p>
                <span className="text-slate-500">Seleccionado:</span> {targetLabel}
              </p>
            )}
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              actions.onScanFocus?.();
              onClose();
            }}
          >
            Escanear QR
          </button>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              actions.onSelectTarget?.();
              onClose();
            }}
          >
            Seleccionar evento/descuento
          </button>
          {canDownloadPdf && (
            <button
              type="button"
              className={itemClass}
              disabled={!isOnline}
              onClick={() => {
                actions.onDownloadPdf?.();
                onClose();
              }}
            >
              Descargar listado
            </button>
          )}
          {canSaveOffline && (
            <button
              type="button"
              className={itemClass}
              disabled={!isOnline}
              onClick={() => {
                actions.onSaveOffline?.();
                onClose();
              }}
            >
              Guardar offline
            </button>
          )}
          {canSync && (
            <button
              type="button"
              className={itemClass}
              disabled={!isOnline || syncing}
              onClick={() => {
                actions.onSync?.();
                onClose();
              }}
            >
              {syncing ? 'Sincronizando…' : 'Sincronizar pendientes'}
            </button>
          )}
          {canInstall && (
            <button
              type="button"
              className={itemClass}
              onClick={() => void install()}
            >
              Instalar PWA
            </button>
          )}
          {isStandalone && (
            <p className="px-4 py-2 text-xs text-emerald-400">App instalada</p>
          )}
          <button
            type="button"
            className={`${itemClass} mt-auto text-red-300 hover:bg-red-900/30`}
            onClick={() => {
              actions.onLogout();
              onClose();
            }}
          >
            Cerrar sesión
          </button>
        </nav>
      </aside>
    </div>
  );
}
