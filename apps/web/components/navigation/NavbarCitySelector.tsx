'use client';

import { NavbarCitySelectField } from './NavbarCitySelectField';
import { useSyncDiscoveryCityUrl } from '@/hooks/useSyncDiscoveryCityUrl';

function NavbarCitySelectorInner() {
  useSyncDiscoveryCityUrl();
  return (
    <>
      <div className="min-w-0 shrink md:hidden">
        <NavbarCitySelectField id="navbar-city-select-mobile" compact />
      </div>
      <div className="hidden min-w-0 shrink md:block">
        <NavbarCitySelectField id="navbar-city-select-desktop" compact />
      </div>
    </>
  );
}

/** Desktop + mobile navbar city picker (requires Suspense for search params). */
export function NavbarCitySelector() {
  return <NavbarCitySelectorInner />;
}
