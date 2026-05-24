'use client';

import { ReactNode } from 'react';
import { useIsPortalPage } from '@/lib/navigation/PortalPageContext';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /**
   * `portal` — sin max-width extra (el layout del portal ya define el ancho).
   * `default` — páginas públicas / auth con `max-w-6xl`.
   * Omitir en rutas `(portal)/*`: se infiere del contexto del layout.
   */
  layout?: 'default' | 'portal';
}

export function PageContainer({
  children,
  className = '',
  layout,
}: PageContainerProps) {
  const inPortal = useIsPortalPage();
  const effectiveLayout = layout ?? (inPortal ? 'portal' : 'default');

  const base =
    effectiveLayout === 'portal'
      ? 'w-full max-w-none px-0 py-6 sm:py-8'
      : 'mx-auto max-w-6xl px-4 py-8';

  return <div className={`${base} ${className}`.trim()}>{children}</div>;
}
