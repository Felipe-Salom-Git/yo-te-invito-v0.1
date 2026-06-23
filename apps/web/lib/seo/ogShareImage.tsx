import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const OG_SHARE_ALT = 'Yo Te Invito';
export const OG_SHARE_SIZE = { width: 1200, height: 630 } as const;
export const OG_SHARE_CONTENT_TYPE = 'image/png';

/** ~32% larger than v1 (620px) for a tighter, more prominent share card. */
const LOGO_WIDTH = 820;
const LOGO_HEIGHT = Math.round(LOGO_WIDTH * (1550 / 1884));

export async function createOgShareImageResponse(): Promise<ImageResponse> {
  const logoData = await readFile(join(process.cwd(), 'public/brand/logo_3.png'));
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          padding: '20px 32px',
        }}
      >
        <img
          src={logoSrc}
          alt=""
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          style={{ objectFit: 'contain' }}
        />
        <p
          style={{
            marginTop: 12,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '0.04em',
          }}
        >
          Eventos · Gastronomía · Excursiones · Rentals
        </p>
      </div>
    ),
    { ...OG_SHARE_SIZE },
  );
}
