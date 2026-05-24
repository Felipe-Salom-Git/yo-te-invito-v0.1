import { FOOTER_TRUST_ITEMS } from '@/lib/navigation/footerPublicConfig';
import { footerSectionTitle } from './footerStyles';

export function FooterTrustBlock() {
  return (
    <section className="min-w-0" aria-labelledby="footer-trust-heading">
      <h2 id="footer-trust-heading" className={footerSectionTitle}>
        Confianza
      </h2>
      <ul className="mt-3 flex max-w-full flex-wrap gap-2">
        {FOOTER_TRUST_ITEMS.map((item) => (
          <li
            key={item}
            className="max-w-full break-words rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs leading-snug text-text-muted"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
