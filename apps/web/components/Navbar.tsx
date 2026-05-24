'use client';

import Link from 'next/link';
import { Logo } from './brand/Logo';
import { NavbarUserMenu } from './NavbarUserMenu';
import { NavbarCartButton } from './navbar/NavbarCartButton';
import { ThemeToggle } from './ThemeToggle';
import { NavbarHomeButton } from './navbar/NavbarHomeButton';
import { NavbarPublicLinks } from './navbar/NavbarPublicLinks';
import { NavbarCitySlot } from './navbar/NavbarCitySlot';
import { NavbarMobileNav } from './navigation/NavbarMobileNav';
import { PUBLIC_NAV_LOGO_HREF } from '@/lib/navigation/publicNavConfig';
import { navFocusRing } from '@/lib/navigation/navA11yClasses';

export function Navbar() {
  return (
    <nav
      className="sticky top-0 z-40 overflow-x-clip overflow-y-visible border-b border-border bg-gradient-to-b from-black/80 via-black/60 to-transparent backdrop-blur-md"
      role="navigation"
      aria-label="Menú principal"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 overflow-x-clip px-3 sm:h-16 sm:px-4 md:h-[4.5rem]">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <Link
            href={PUBLIC_NAV_LOGO_HREF}
            className={`flex min-w-0 shrink items-center text-text transition-colors hover:text-accent [&_img]:h-9 [&_img]:w-auto sm:[&_img]:h-11 md:[&_img]:h-12 ${navFocusRing} rounded`}
            aria-label="Elegir categoría"
          >
            <span className="md:hidden">
              <Logo variant="navbar" priority showText={false} />
            </span>
            <span className="hidden md:inline-flex">
              <Logo variant="navbar" priority showText />
            </span>
          </Link>
          <NavbarHomeButton />
          <NavbarPublicLinks />
          <NavbarCitySlot />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <NavbarCartButton />
          <NavbarMobileNav />
          <div className="hidden md:flex md:items-center">
            <NavbarUserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
