import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';

export const size = { width: 48, height: 48 };
export const contentType = 'image/png';

export default async function Icon() {
  const logoData = await readFile(join(process.cwd(), 'public/brand/logo.png'));
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <img src={logoSrc} alt="" width={48} height={48} style={{ objectFit: 'contain' }} />
      </div>
    ),
    { ...size },
  );
}
