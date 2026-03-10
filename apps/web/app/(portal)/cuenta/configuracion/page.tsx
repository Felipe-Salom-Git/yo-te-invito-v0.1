'use client';

import { useState } from 'react';
import { clearLastSeen } from '@/lib/introStorage';
import { PageContainer, SectionTitle, Button } from '@/components';

export default function ConfiguracionPage() {
  const [replayDone, setReplayDone] = useState(false);

  const handleReplayIntro = () => {
    if (typeof window === 'undefined') return;
    clearLastSeen();
    setReplayDone(true);
    window.location.href = '/';
  };

  return (
    <PageContainer>
      <SectionTitle>Configuración</SectionTitle>

      <section className="mt-6 space-y-6">
        <div className="rounded-lg border border-border bg-bg-muted p-4">
          <h3 className="font-semibold text-text">Intro de bienvenida</h3>
          <p className="mt-1 text-sm text-text-muted">
            Volver a mostrar la animación de introducción la próxima vez que entres.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={handleReplayIntro}
          >
            Replay Intro
          </Button>
          {replayDone && (
            <p className="mt-2 text-xs text-accent">Se redirigirá a la intro.</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-bg-muted p-4">
          <h3 className="font-semibold text-text">Ciudad preferida</h3>
          <p className="mt-1 text-sm text-text-muted">
            Configurala en <a href="/cuenta/preferencias" className="text-accent hover:underline">Preferencias</a>.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-bg-muted p-4">
          <h3 className="font-semibold text-text">Notificaciones</h3>
          <p className="mt-1 text-sm text-text-muted">
            Configuralas en <a href="/cuenta/preferencias" className="text-accent hover:underline">Preferencias</a>.
          </p>
        </div>
      </section>
    </PageContainer>
  );
}
