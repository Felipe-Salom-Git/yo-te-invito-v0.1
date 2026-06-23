import { FOOTER_DEVELOPER_CREDIT } from '@/lib/navigation/footerPublicConfig';
import {
  footerBottomLinkClass,
  footerBottomRowClass,
  footerBottomSeparatorClass,
} from './footerStyles';

export function FooterDeveloperCredit() {
  const { name, phone, phoneTel } = FOOTER_DEVELOPER_CREDIT;

  return (
    <p className={footerBottomRowClass}>
      <span>Desarrollado por {name}</span>
      <span className={footerBottomSeparatorClass} aria-hidden="true">
        •
      </span>
      <a href={`tel:${phoneTel}`} className={footerBottomLinkClass}>
        {phone}
      </a>
      <span className={footerBottomSeparatorClass} aria-hidden="true">
        •
      </span>
      <span>© {new Date().getFullYear()} Yo Te Invito. Todos los derechos reservados.</span>
    </p>
  );
}
