import type { FooterContactDisplay } from '@/lib/navigation/footerPublicContact';
import {
  footerSupportHeadingClass,
  footerSupportLabelClass,
  footerSupportValueClass,
} from './footerStyles';

type Props = {
  contact: FooterContactDisplay;
  /** Minimal footer — sin encabezado de sección */
  compact?: boolean;
};

export function FooterContactBlock({ contact, compact }: Props) {
  return (
    <section
      id="footer-support"
      className="min-w-0 scroll-mt-24"
      aria-labelledby={compact ? undefined : 'footer-support-heading'}
    >
      {!compact ? (
        <h2 id="footer-support-heading" className={footerSupportHeadingClass}>
          Soporte
        </h2>
      ) : null}
      <div className={`flex flex-col gap-3 ${compact ? '' : 'mt-3'}`}>
        {contact.phone ? (
          <div className="min-w-0">
            <span className={footerSupportLabelClass}>WhatsApp</span>
            <a
              href={contact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={footerSupportValueClass}
              aria-label={`WhatsApp de soporte: ${contact.phone} (se abre en una nueva pestaña)`}
            >
              {contact.phone}
            </a>
          </div>
        ) : null}
        {contact.email ? (
          <div className="min-w-0">
            <span className={footerSupportLabelClass}>Email</span>
            <a href={`mailto:${contact.email}`} className={footerSupportValueClass}>
              {contact.email}
            </a>
          </div>
        ) : null}
        {contact.address ? (
          <p className="text-sm text-text-muted">{contact.address}</p>
        ) : null}
      </div>
    </section>
  );
}
