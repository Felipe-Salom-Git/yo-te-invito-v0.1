'use client';

import type {
  DiscountVisualRenderContext,
  GastroDiscountClaimStatus,
  GastroDiscountClaimType,
  GastroDiscountVisualTemplateResponse,
} from '@yo-te-invito/shared';
import { ManualShortCodeBlock } from '@/components/ux/ManualShortCodeBlock';
import { GastroDiscountQrCard } from './GastroDiscountQrCard';
import { DiscountTemplateRenderer } from './DiscountTemplateRenderer';
import { VisualRenderErrorBoundary } from './VisualRenderErrorBoundary';

type Props = {
  locationName: string;
  discountTitle: string;
  discountDescription?: string | null;
  discountLabel?: string | null;
  qrPayload: string;
  qrCode?: string;
  /** Display short code (`XXX-XXX`) of the claim, for manual entry. */
  shortCodeDisplay?: string | null;
  status: GastroDiscountClaimStatus;
  validTo?: string | null;
  type?: GastroDiscountClaimType;
  visualTemplate?: GastroDiscountVisualTemplateResponse | null;
  renderContext?: DiscountVisualRenderContext | null;
  className?: string;
};

export function GastroDiscountVisualCoupon(props: Props) {
  const fallback = (
    <GastroDiscountQrCard
      locationName={props.locationName}
      discountTitle={props.discountTitle}
      discountDescription={props.discountDescription}
      discountLabel={props.discountLabel}
      qrPayload={props.qrPayload}
      qrCode={props.qrCode}
      shortCodeDisplay={props.shortCodeDisplay}
      status={props.status}
      validTo={props.validTo}
      type={props.type}
      className={props.className}
    />
  );

  const printBtn = (
    <div className="mt-3 flex justify-center print:hidden">
      <button
        type="button"
        className="text-sm font-medium text-accent hover:underline"
        onClick={() => window.print()}
      >
        Imprimir cupón
      </button>
    </div>
  );

  if (!props.visualTemplate || !props.renderContext) {
    return (
      <div>
        {fallback}
        {printBtn}
      </div>
    );
  }

  return (
    <div>
      <VisualRenderErrorBoundary fallback={fallback}>
        <DiscountTemplateRenderer
          template={props.visualTemplate}
          ctx={props.renderContext}
          qrPayload={props.qrPayload}
          blocked={props.status !== 'ACTIVE'}
          className={props.className}
        />
        {/* The printed template already carries the shortCode layer (canonical, mandatory). */}
        {props.shortCodeDisplay ? (
          <ManualShortCodeBlock
            code={props.shortCodeDisplay}
            muted={props.status !== 'ACTIVE'}
            className="mt-4 print:hidden"
          />
        ) : null}
      </VisualRenderErrorBoundary>
      {printBtn}
    </div>
  );
}
