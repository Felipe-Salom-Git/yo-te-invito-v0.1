'use client';

import Link from 'next/link';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { resolveFooterContact } from '@/lib/navigation/footerPublicContact';
import {
  RENTAL_PROVIDER_CTA_BODY,
  RENTAL_PROVIDER_CTA_BUTTON,
  RENTAL_PROVIDER_CTA_MAIL_SUBJECT,
  RENTAL_PROVIDER_CTA_TITLE,
  RENTAL_PROVIDER_RESPONSIBILITY_NOTE,
} from '@/lib/rentals/publicCopy';

type Props = {
  className?: string;
  /** Dark category landing vs light detail page */
  variant?: 'dark' | 'light';
};

export function RentalProviderContactCta({ className = '', variant = 'dark' }: Props) {
  const { data: platformConfig } = usePublicPlatformConfig();
  const contact = resolveFooterContact(platformConfig);

  const mailtoHref = contact.email
    ? `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(RENTAL_PROVIDER_CTA_MAIL_SUBJECT)}`
    : null;

  const isDark = variant === 'dark';
  const shell = isDark
    ? 'border-white/15 bg-white/5 text-white'
    : 'border-border bg-bg-muted/40 text-text';
  const bodyClass = isDark ? 'text-white/75' : 'text-text-muted';
  const btnClass = isDark
    ? 'inline-flex min-h-11 items-center justify-center rounded-lg border border-accent bg-accent/10 px-5 py-2.5 text-sm font-semibold text-accent hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
    : 'inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

  return (
    <aside
      className={`rounded-xl border px-4 py-5 sm:px-6 sm:py-6 ${shell} ${className}`}
      aria-labelledby="rental-provider-cta-heading"
    >
      <h2 id="rental-provider-cta-heading" className="text-base font-semibold sm:text-lg">
        {RENTAL_PROVIDER_CTA_TITLE}
      </h2>
      <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${bodyClass}`}>
        {RENTAL_PROVIDER_CTA_BODY}
      </p>
      <p className={`mt-3 max-w-2xl text-xs leading-relaxed ${bodyClass}`} role="note">
        {RENTAL_PROVIDER_RESPONSIBILITY_NOTE}
      </p>
      <div className="mt-4">
        {mailtoHref ? (
          <a href={mailtoHref} className={btnClass}>
            {RENTAL_PROVIDER_CTA_BUTTON}
          </a>
        ) : (
          <Link href="/#footer-support" className={btnClass}>
            {RENTAL_PROVIDER_CTA_BUTTON}
          </Link>
        )}
      </div>
    </aside>
  );
}
