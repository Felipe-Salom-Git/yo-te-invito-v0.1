'use client';

import { buildTicketQrImageUrl } from '@/lib/tickets/qr-image-url';
import { MIN_QR_DISPLAY_PX } from '@/lib/tickets/qr-display';

type Props = {
  qrPayload: string;
  sizePx?: number;
  className?: string;
  alt?: string;
};

/** High-contrast QR for scan and print (quiet zone via API margin param). */
export function TicketQrImage({ qrPayload, sizePx = 280, className = '', alt = 'Código QR' }: Props) {
  const edge = Math.max(sizePx, MIN_QR_DISPLAY_PX);

  return (
    <div
      className={`ticket-qr-image inline-flex max-w-full items-center justify-center rounded-lg border border-neutral-200 bg-white p-3 shadow-sm print:border-neutral-400 print:p-4 print:shadow-none ${className}`}
      data-qr-size={edge}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={buildTicketQrImageUrl(qrPayload, edge)}
        alt={alt}
        width={edge}
        height={edge}
        className="block size-auto max-w-full"
        style={{
          width: edge,
          height: edge,
          minWidth: MIN_QR_DISPLAY_PX,
          minHeight: MIN_QR_DISPLAY_PX,
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}
