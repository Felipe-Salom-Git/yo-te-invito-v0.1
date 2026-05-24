import type { FooterContactDisplay } from '@/lib/navigation/footerPublicContact';
import { footerLinkClass, footerSectionTitle } from './footerStyles';

const SUPPORT_INTRO = 'Consultas sobre la plataforma, tus entradas o contenido publicado.';

type Props = {
  contact: FooterContactDisplay;
  /** Minimal footer — sin intro larga */
  compact?: boolean;
};

export function FooterContactBlock({ contact, compact }: Props) {
  const hasContact = contact.email || contact.phone || contact.address;

  return (
    <section
      className="min-w-0"
      aria-labelledby={compact ? undefined : 'footer-support-heading'}
    >
      {!compact ? (
        <>
          <h2 id="footer-support-heading" className={footerSectionTitle}>
            Soporte
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">{SUPPORT_INTRO}</p>
        </>
      ) : null}
      {hasContact ? (
        <div className={`flex flex-col gap-2 text-sm ${compact ? '' : 'mt-3'}`}>
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className={footerLinkClass}>
              {contact.email}
            </a>
          ) : null}
          {contact.phone ? (
            <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className={footerLinkClass}>
              {contact.phone}
            </a>
          ) : null}
          {contact.address ? (
            <p className="text-sm text-text-muted">{contact.address}</p>
          ) : null}
        </div>
      ) : null}
      {contact.isPlaceholder ? (
        <p className="mt-2 text-[0.65rem] text-text-muted/75">
          Contacto de demostración — datos reales pendientes.
        </p>
      ) : null}
    </section>
  );
}
