'use client';

import { NavbarCitySelectField } from './NavbarCitySelectField';

/** Desktop navbar city picker (`md+`) — right cluster, compact width. */
export function NavbarCitySelector() {
  return (
    <div className="hidden min-w-0 shrink md:block">
      <NavbarCitySelectField id="navbar-city-select-desktop" hideLabel />
    </div>
  );
}

/** Mobile header city picker — compact, visible below `md`. */
export function NavbarCitySelectorMobile() {
  return (
    <div className="min-w-0 shrink md:hidden">
      <NavbarCitySelectField id="navbar-city-select-mobile" hideLabel />
    </div>
  );
}
