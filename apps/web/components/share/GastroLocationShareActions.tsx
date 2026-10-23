'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components';
import { shareUrl } from '@/lib/share/shareUrl';
import {
  buildGastroLocationShareMessage,
  buildPublicGastroCanonicalUrl,
  buildWhatsAppShareHref,
} from '@/lib/share/gastroLocationShare';

type Variant = 'inline' | 'card';

const INLINE_BTN =
  'text-sm font-medium text-accent hover:underline disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg';

const CARD_BTN =
  'flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50';

export function GastroLocationShareActions({
  displayName,
  profileId,
  variant = 'inline',
}: {
  displayName: string;
  profileId: string;
  variant?: Variant;
}) {
  const { addToast } = useToast();
  const [canNative, setCanNative] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCanNative(typeof navigator.share === 'function');
  }, []);

  const payload = () => {
    const url = buildPublicGastroCanonicalUrl(window.location.origin, profileId);
    return { url, message: buildGastroLocationShareMessage(displayName, url) };
  };

  const onNative = async () => {
    setBusy(true);
    try {
      const { url, message } = payload();
      const result = await shareUrl({ title: displayName, url, text: message });
      if (result.success && result.method === 'copy') {
        addToast('Enlace copiado', 'success');
      } else if (!result.success && result.error !== 'Cancelled') {
        setShowFallback(true);
        addToast('No se pudo compartir. Usá WhatsApp o copiá el enlace.', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    try {
      const { url } = payload();
      await navigator.clipboard.writeText(url);
      addToast('Enlace copiado', 'success');
    } catch {
      addToast('No se pudo copiar el enlace.', 'error');
    }
  };

  const onWhatsApp = () => {
    const { message } = payload();
    window.open(buildWhatsAppShareHref(message), '_blank', 'noopener,noreferrer');
  };

  const fallback = !canNative || showFallback;
  const btn = variant === 'card' ? CARD_BTN : INLINE_BTN;

  const actions = (
    <div className={variant === 'card' ? 'mt-3 flex flex-col gap-2' : 'flex flex-wrap gap-2'}>
      {canNative ? (
        <button
          type="button"
          className={btn}
          onClick={() => void onNative()}
          disabled={busy}
          aria-label={`Compartir ${displayName}`}
        >
          {busy ? 'Compartiendo…' : 'Compartir'}
        </button>
      ) : null}
      {fallback ? (
        <>
          <button type="button" className={btn} onClick={onWhatsApp} aria-label={`Compartir ${displayName} por WhatsApp`}>
            WhatsApp
          </button>
          <button type="button" className={btn} onClick={() => void onCopy()} aria-label={`Copiar enlace de ${displayName}`}>
            Copiar enlace
          </button>
        </>
      ) : null}
    </div>
  );

  if (variant === 'card') {
    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5" aria-label="Compartir local">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Compartir</h2>
        <p className="mt-1 text-sm text-text-muted">Enviá la ficha pública de {displayName}.</p>
        {actions}
      </section>
    );
  }

  return actions;
}
