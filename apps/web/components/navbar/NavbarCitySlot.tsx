import { Suspense } from 'react';
import { NavbarCitySelector } from '@/components/navigation/NavbarCitySelector';

function NavbarCitySelectorFallback() {
  return (
    <div
      className="hidden h-9 w-[7.5rem] shrink-0 rounded border border-border/50 bg-bg-muted/40 md:block"
      aria-hidden
    />
  );
}

/** Slice 5 — city selector (requires Suspense for `useSearchParams`). */
export function NavbarCitySlot() {
  return (
    <Suspense fallback={<NavbarCitySelectorFallback />}>
      <NavbarCitySelector />
    </Suspense>
  );
}
