import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { FOOTER_INSTITUTIONAL_COPY } from '@/lib/navigation/footerPublicConfig';
import { navFocusRing } from '@/lib/navigation/navA11yClasses';

export function FooterBrandBlock() {
  return (
    <div className="min-w-0 space-y-4">
      <Link
        href="/categorias"
        className={`inline-flex max-w-[200px] ${navFocusRing} rounded`}
        aria-label="Yo Te Invito — elegir categoría"
      >
        <Logo variant="auth" showText className="opacity-95" />
      </Link>
      <p className="max-w-sm break-words text-sm leading-relaxed text-text-muted">
        {FOOTER_INSTITUTIONAL_COPY}
      </p>
    </div>
  );
}
