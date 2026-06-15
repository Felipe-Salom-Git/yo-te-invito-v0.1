import { Suspense } from 'react';
import { NavbarCitySelector, NavbarCitySelectorMobile } from '@/components/navigation/NavbarCitySelector';

function NavbarCitySelectorFallback() {
  return (
    <div
      className="h-8 w-[6rem] shrink-0 rounded border border-border/50 bg-bg-muted/40 sm:w-[6.5rem]"
      aria-hidden
    />
  );
}

/** City selector — compact on mobile header + desktop right cluster. */
export function NavbarCitySlot() {
  return (
    <Suspense fallback={<NavbarCitySelectorFallback />}>
      <NavbarCitySelectorMobile />
      <NavbarCitySelector />
    </Suspense>
  );
}
