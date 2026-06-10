'use client';

import { useEffect } from 'react';

/** V3.1 Etapa 13 — dark-only; clears legacy light preference on mount. */
export function ThemeToggle() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.removeAttribute('data-theme');
    try {
      if (localStorage.getItem('yti:theme') === 'light') {
        localStorage.removeItem('yti:theme');
      }
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
