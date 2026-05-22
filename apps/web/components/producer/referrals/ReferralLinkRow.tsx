'use client';

import type { ReferralLinkSummary } from '@/repositories/interfaces';
import { CopyReferralLinkButton } from './CopyReferralLinkButton';
import { buildReferralCheckoutUrl, buildReferralShortUrl } from '@/lib/producer/referral-display';

type Props = {
  eventId: string;
  tenantId?: string | null;
  link: ReferralLinkSummary;
  urlOverride?: string;
  referrerName?: string | null;
  onCopySuccess?: () => void;
  onCopyError?: () => void;
};

export function ReferralLinkRow({
  eventId,
  tenantId,
  link,
  urlOverride,
  referrerName,
  onCopySuccess,
  onCopyError,
}: Props) {
  const checkoutUrl = urlOverride ?? buildReferralCheckoutUrl(eventId, link.code, tenantId);
  const shortUrl = buildReferralShortUrl(link.code);

  return (
    <li className="rounded-xl border border-border bg-bg-muted/30 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-accent">{link.code}</span>
            {link.label ? (
              <span className="text-sm text-text-muted">— {link.label}</span>
            ) : null}
          </div>
          {referrerName ? (
            <p className="mt-1 text-sm text-text">{referrerName}</p>
          ) : link.referrerProfileId ? (
            <p className="mt-1 text-xs text-text-muted">
              Perfil referidor vinculado
            </p>
          ) : null}
          <p className="mt-2 break-all text-xs text-text-muted">{checkoutUrl}</p>
          <p className="mt-1 text-xs text-text-muted">
            Corto: <span className="font-mono text-accent">{shortUrl}</span>
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Creado:{' '}
            {new Date(link.createdAt).toLocaleString('es-AR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="text-right text-sm">
            <p className="text-xs text-text-muted">Ventas atribuidas</p>
            <p className="font-semibold text-text">{link.attributedOrdersCount}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyReferralLinkButton
              text={checkoutUrl}
              label="Copiar checkout"
              className="w-full sm:w-auto"
              onCopied={onCopySuccess}
              onError={onCopyError}
            />
            <CopyReferralLinkButton
              text={shortUrl}
              label="Copiar /r/"
              variant="ghost"
              className="w-full sm:w-auto"
              onCopied={onCopySuccess}
              onError={onCopyError}
            />
          </div>
        </div>
      </div>
    </li>
  );
}
