import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { FOOTER_INSTITUTIONAL_COPY } from '@/lib/navigation/footerPublicConfig';
import { navFocusRing } from '@/lib/navigation/navA11yClasses';

export function FooterBrandBlock() {
  return (
    <div className="min-w-0 max-w-xs space-y-3">
      <Link
        href="/categorias"
        className={`inline-flex max-w-full items-center gap-2.5 ${navFocusRing} rounded`}
        aria-label="Yo Te Invito — elegir categoría"
      >
        <Logo
          variant="icon"
          showText={false}
          width={48}
          height={48}
          className="shrink-0 opacity-100 [&>img]:size-11 sm:[&>img]:size-12"
        />
        <span className="whitespace-nowrap text-base font-bold text-text">
          Yo Te Invito
        </span>
      </Link>
      <p className="text-sm leading-relaxed text-text/85">{FOOTER_INSTITUTIONAL_COPY}</p>
    </div>
  );
}
