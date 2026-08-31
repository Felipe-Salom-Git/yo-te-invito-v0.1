'use client';

import type {
  DiscountVisualRenderContext,
  GastroDiscountClaimStatus,
  GastroDiscountClaimType,
  GastroDiscountVisualTemplateResponse,
} from '@yo-te-invito/shared';
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
      </VisualRenderErrorBoundary>
      {printBtn}
    </div>
  );
}
