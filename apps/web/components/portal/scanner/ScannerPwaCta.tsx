'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, useToast } from '@/components';

const SCANNER_URL =
  process.env.NEXT_PUBLIC_SCANNER_APP_URL ?? 'http://localhost:3002/door';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function ScannerPwaCta({ className = '' }: { className?: string }) {
  const { addToast } = useToast();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SCANNER_URL);
      addToast('Link del Scanner copiado.', 'success');
    } catch {
      addToast('No se pudo copiar. Abrí el scanner y copiá la URL del navegador.', 'error');
    }
  }, [addToast]);

  const installPwa = useCallback(async () => {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
      return;
    }
    setShowInstructions((v) => !v);
  }, [installEvent]);

  return (
    <section
      className={`rounded-xl border border-border/80 bg-bg-muted/40 p-4 ${className}`.trim()}
    >
      <h2 className="text-sm font-semibold text-text">Scanner PWA</h2>
      <p className="mt-1 text-sm text-text-muted">
        Abrí o instalá la app de escaneo en el celular del equipo de puerta. Solo valida entradas y
        descuentos; no da acceso al panel administrativo.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={SCANNER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
        >
          Abrir Scanner
        </a>
        <Button type="button" variant="secondary" size="sm" onClick={() => void installPwa()}>
          {installEvent ? 'Instalar Scanner PWA' : 'Cómo instalar'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => void copyLink()}>
          Copiar link
        </Button>
      </div>
      {showInstructions && (
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-bg/60 p-3 text-sm text-text-muted">
          <div>
            <p className="font-medium text-text">Android (Chrome)</p>
            <p className="mt-1">
              Abrí el link → menú ⋮ → «Instalar app» o «Agregar a pantalla de inicio».
            </p>
          </div>
          <div>
            <p className="font-medium text-text">iPhone (Safari)</p>
            <p className="mt-1">
              Abrí el link en Safari → botón compartir → «Agregar a inicio».
            </p>
          </div>
          <p className="text-xs">
            Producción:{' '}
            <span className="font-mono text-text">scanner.yoteinvito.club/door</span>
          </p>
        </div>
      )}
    </section>
  );
}
