'use client';

import Link from 'next/link';
import { Logo } from './brand/Logo';
import { NavbarUserMenu } from './NavbarUserMenu';
import { ThemeToggle } from './ThemeToggle';
import { useRole } from '@/hooks/useRole';
import { CATEGORY_GATEWAY_PATH } from '@/lib/home/categoryGatewayConfig';

export function Navbar() {
  const { role } = useRole();

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-gradient-to-b from-black/80 via-black/60 to-transparent backdrop-blur-md" role="navigation" aria-label="Menú principal">
      <div className="mx-auto flex h-16 sm:h-20 max-w-6xl items-center justify-between px-3 sm:px-4">
        <Link
          href={CATEGORY_GATEWAY_PATH}
          className="flex items-center gap-2 text-text hover:text-accent transition-colors"
          aria-label="Elegir categoría"
        >
          <Logo variant="navbar" priority showText />
        </Link>
        <div className="flex items-center gap-2 sm:gap-6 text-sm">
          <ThemeToggle />
          <Link href="/home" className="text-text-muted hover:text-accent transition-colors" aria-label="Ver eventos">
            Eventos
          </Link>
          <Link href="/explore" className="text-text-muted hover:text-accent transition-colors">
            Explorar
          </Link>
          <Link href="/referrers" className="text-text-muted hover:text-accent transition-colors">
            Referidores
          </Link>
          <Link href="/reventa" className="text-text-muted hover:text-accent transition-colors">
            Reventa
          </Link>
          {role === 'ADMIN' && (
            <Link href="/admin" className="text-text-muted hover:text-accent transition-colors">
              Admin
            </Link>
          )}
          <NavbarUserMenu />
        </div>
      </div>
    </nav>
  );
}
