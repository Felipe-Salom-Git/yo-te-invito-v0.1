'use client';

import { NavbarCitySelectField } from './NavbarCitySelectField';

/**
 * Desktop navbar city picker (`md+`).
 */
export function NavbarCitySelector() {
  return (
    <div className="hidden min-w-0 max-w-[8.5rem] shrink md:block lg:max-w-[9.5rem]">
      <NavbarCitySelectField id="navbar-city-select-desktop" />
    </div>
  );
}
