export const MANUAL_SHORT_CODE_LABEL = 'Código para ingresar manualmente';

type ManualShortCodeBlockProps = {
  /** Display value (`XXX-XXX`), never the QR token. */
  code: string;
  /** Used / expired / cancelled coupons keep the code visible but de-emphasized. */
  muted?: boolean;
  className?: string;
};

/**
 * Manual short code shown under a coupon QR — same copy as the claim email.
 * Código corto bajo el QR del cupón, mismo texto que el email.
 */
export function ManualShortCodeBlock({ code, muted = false, className = '' }: ManualShortCodeBlockProps) {
  return (
    <div className={`text-center ${className}`}>
      <p className="text-xs text-text-muted">{MANUAL_SHORT_CODE_LABEL}</p>
      <p
        className={`mt-1 inline-block select-all rounded-lg border border-dashed px-4 py-2 font-mono text-2xl font-bold tracking-[0.25em] ${
          muted ? 'border-border text-text-muted' : 'border-accent text-accent'
        }`}
      >
        {code}
      </p>
    </div>
  );
}
