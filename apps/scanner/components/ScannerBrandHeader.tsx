import Image from 'next/image';
import { SCANNER_APP_NAME, SCANNER_LOGO_SRC, SCANNER_TAGLINE } from '@/lib/scanner-brand';

type Props = {
  subtitle?: string;
  compact?: boolean;
};

export function ScannerBrandHeader({ subtitle, compact }: Props) {
  const size = compact ? 48 : 64;
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src={SCANNER_LOGO_SRC}
        alt=""
        width={size}
        height={size}
        className="rounded-2xl border border-scanner-border"
        priority
      />
      <h1 className={`mt-4 font-bold text-white ${compact ? 'text-lg' : 'text-2xl'}`}>
        {SCANNER_APP_NAME}
      </h1>
      <p className="mt-1 max-w-xs text-sm text-scanner-muted">
        {subtitle ?? SCANNER_TAGLINE}
      </p>
    </div>
  );
}
