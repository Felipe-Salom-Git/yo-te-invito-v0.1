import { Suspense } from 'react';
import { NavbarCitySelector } from '@/components/navigation/NavbarCitySelector';

function NavbarCitySelectorFallback() {
  return (
    <div
      className="h-10 w-[6rem] shrink-0 rounded border border-border/50 bg-bg-muted/40 sm:w-[6.5rem]"
      aria-hidden
    />
  );
}

/** City selector — compact on mobile header + desktop right cluster. */
export function NavbarCitySlot() {
  return (
    <Suspense fallback={<NavbarCitySelectorFallback />}>
      <NavbarCitySelector />
    </Suspense>
  );
}
