'use client';

import Link from 'next/link';

/** Secondary navigation — does not block category selection. */
export function CategoryGatewayFooter() {
  return (
    <footer className="mt-3 flex shrink-0 flex-col items-stretch gap-2 border-t border-white/10 pt-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-center sm:gap-5">
      <Link
        href="/home"
        className="rounded-md px-2 py-2.5 text-center text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/75 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:py-1.5 sm:text-xs"
      >
        Ir al inicio
      </Link>
      <Link
        href="/explore"
        className="rounded-md bg-accent/15 px-2 py-2.5 text-center text-[0.65rem] font-bold uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:py-1.5 sm:text-xs"
      >
        Explorar todo
      </Link>
    </footer>
  );
}
