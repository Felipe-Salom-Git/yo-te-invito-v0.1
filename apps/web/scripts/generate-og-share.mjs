/**
 * Generates versioned OG share PNG for cache bust (WhatsApp, etc.).
 * Run: node scripts/generate-og-share.mjs
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ImageResponse } = require('next/og');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public/brand');
const outFile = join(outDir, 'og-logo3-black-v2.png');

const logoData = await readFile(join(root, 'public/brand/logo_3.png'));
const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;

const logoWidth = 820;
const logoHeight = Math.round(logoWidth * (1550 / 1884));

const image = new ImageResponse(
  {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        padding: '20px 32px',
      },
      children: [
        {
          type: 'img',
          props: {
            src: logoSrc,
            width: logoWidth,
            height: logoHeight,
            style: { objectFit: 'contain' },
          },
        },
        {
          type: 'p',
          props: {
            style: {
              marginTop: 12,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: '0.04em',
            },
            children: 'Eventos · Gastronomía · Excursiones · Rentals',
          },
        },
      ],
    },
  },
  { width: 1200, height: 630 },
);

await mkdir(outDir, { recursive: true });
const buffer = Buffer.from(await image.arrayBuffer());
await writeFile(outFile, buffer);
console.log(`Wrote ${outFile} (${buffer.length} bytes)`);
