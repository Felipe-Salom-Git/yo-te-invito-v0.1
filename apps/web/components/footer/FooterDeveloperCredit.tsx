import { FOOTER_DEVELOPER_CREDIT } from '@/lib/navigation/footerPublicConfig';
import { footerLinkClass } from './footerStyles';

function isSafeExternalUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function FooterDeveloperCredit() {
  const { teamName, webUrl, socialUrl, placeholder } = FOOTER_DEVELOPER_CREDIT;
  const safeWeb = webUrl && isSafeExternalUrl(webUrl) ? webUrl : null;
  const safeSocial = socialUrl && isSafeExternalUrl(socialUrl) ? socialUrl : null;

  return (
    <p className="min-w-0 text-xs text-text-muted/80">
      {safeWeb ? (
        <a
          href={safeWeb}
          target="_blank"
          rel="noopener noreferrer"
          className={`${footerLinkClass} text-xs`}
          aria-label="Sitio web del equipo de desarrollo (nueva pestaña)"
        >
          Desarrollo web por {teamName}
        </a>
      ) : (
        <span>
          Desarrollo web por{' '}
          <span className={placeholder ? 'text-text-muted/60' : undefined}>{teamName}</span>
        </span>
      )}
      {safeSocial ? (
        <>
          {' · '}
          <a
            href={safeSocial}
            target="_blank"
            rel="noopener noreferrer"
            className={`${footerLinkClass} text-xs`}
            aria-label="Red social del equipo de desarrollo (nueva pestaña)"
          >
            Red del equipo
          </a>
        </>
      ) : null}
      {placeholder ? (
        <span className="mt-0.5 block text-[0.6rem] text-text-muted/60">
          Enlaces del equipo — datos reales pendientes.
        </span>
      ) : null}
    </p>
  );
}
