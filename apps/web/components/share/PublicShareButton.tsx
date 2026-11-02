'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components';
import { shareUrl } from '@/lib/share/shareUrl';
import { buildWhatsAppShareHref } from '@/lib/share/gastroLocationShare';
import {
  buildPublicShareMessage,
  buildPublicShareUrl,
  type PublicShareKind,
} from '@/lib/share/publicShare';

type PublicShareButtonProps = {
  title: string;
  /** Public path (`/events/{id}`, `/gastronomicos/{id}`…). Query strings are dropped. */
  path: string;
  kind: PublicShareKind;
  /** `overlay` for heroes / dark media, `subtle` for cards and list rows. */
  tone?: 'overlay' | 'subtle';
  /** Fallback menu direction: `up` inside `overflow-hidden` heroes anchored to the bottom. */
  menuPlacement?: 'up' | 'down';
  className?: string;
};

const TONE_CLASS = {
  overlay:
    'border-white/25 bg-black/40 text-white/90 backdrop-blur-sm hover:border-accent/60 hover:text-white',
  subtle: 'border-border bg-bg-muted/60 text-text hover:border-accent/60 hover:text-accent',
} as const;

const MENU_ITEM =
  'block w-full rounded-md px-3 py-2 text-left text-sm text-text hover:bg-white/10 focus:bg-white/10 focus:outline-none';

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Single share action for every public detail (hero under the title, preview modal, lists).
 * Web Share when available; otherwise WhatsApp / Copiar enlace (G9 fallback).
 * Botón único de compartir para todas las fichas públicas.
 */
export function PublicShareButton({
  title,
  path,
  kind,
  tone = 'overlay',
  menuPlacement = 'down',
  className = '',
}: PublicShareButtonProps) {
  const { addToast } = useToast();
  const [canNative, setCanNative] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanNative(typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [menuOpen]);

  const payload = () => {
    const url = buildPublicShareUrl(window.location.origin, path);
    return { url, message: buildPublicShareMessage(kind, title, url) };
  };

  const onClick = async () => {
    if (!canNative) {
      setMenuOpen((open) => !open);
      return;
    }
    setBusy(true);
    try {
      const { url, message } = payload();
      const result = await shareUrl({ title, url, text: message });
      if (result.success && result.method === 'copy') {
        addToast('Enlace copiado', 'success');
      } else if (!result.success && result.error !== 'Cancelled') {
        setMenuOpen(true);
        addToast('No se pudo compartir. Usá WhatsApp o copiá el enlace.', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(payload().url);
      addToast('Enlace copiado', 'success');
    } catch {
      addToast('No se pudo copiar el enlace.', 'error');
    }
  };

  const onWhatsApp = () => {
    setMenuOpen(false);
    window.open(buildWhatsAppShareHref(payload().message), '_blank', 'noopener,noreferrer');
  };

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy}
        aria-label={`Compartir ${title}`}
        aria-haspopup={canNative ? undefined : 'menu'}
        aria-expanded={canNative ? undefined : menuOpen}
        className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:opacity-50 ${TONE_CLASS[tone]}`}
      >
        <ShareIcon />
        <span>{busy ? 'Compartiendo…' : 'Compartir'}</span>
      </button>
      {menuOpen ? (
        <div
          role="menu"
          aria-label={`Compartir ${title}`}
          className={`absolute left-0 z-30 w-48 rounded-lg border border-border bg-bg-muted p-1 shadow-xl ${
            menuPlacement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <button type="button" role="menuitem" className={MENU_ITEM} onClick={onWhatsApp}>
            WhatsApp
          </button>
          <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => void onCopy()}>
            Copiar enlace
          </button>
        </div>
      ) : null}
    </div>
  );
}
