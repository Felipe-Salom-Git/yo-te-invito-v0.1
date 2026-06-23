import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';

export const alt = 'Yo Te Invito';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
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
          padding: '48px',
        }}
      >
        <img
          src={logoSrc}
          alt=""
          width={620}
          height={512}
          style={{ objectFit: 'contain' }}
        />
        <p
          style={{
            marginTop: 28,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: '0.04em',
          }}
        >
          Eventos · Gastronomía · Excursiones · Rentals
        </p>
      </div>
    ),
    { ...size },
  );
}
