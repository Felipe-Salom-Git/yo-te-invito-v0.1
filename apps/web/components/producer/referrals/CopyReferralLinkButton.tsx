'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components';
import { copyTextToClipboard } from '@/lib/producer/copy-to-clipboard';

type Props = {
  text: string;
  label?: string;
  copiedLabel?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
  onCopied?: () => void;
  onError?: () => void;
};

export function CopyReferralLinkButton({
  text,
  label = 'Copiar link',
  copiedLabel = 'Copiado',
  size = 'sm',
  variant = 'outline',
  className = '',
  onCopied,
  onError,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      onError?.();
    }
  }, [text, onCopied, onError]);

  return (
    <Button
      type="button"
      size={size}
      variant={copied ? 'secondary' : variant}
      className={className}
      onClick={() => void handleCopy()}
      aria-live="polite"
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}
