'use client';

import { usePathname } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { getFooterVariant } from '@/lib/navigation/footerVisibility';

/**
 * Route-aware footer for root layout — keeps app/layout.tsx as Server Component.
 */
export function RouteAwareFooter() {
  const pathname = usePathname();
  const variant = getFooterVariant(pathname);
  return <Footer variant={variant} />;
}
