/**
 * G12.3 — Public detail heroes never clip their top content under the navbar on mobile:
 * min-height hero (grows downwards) + in-flow sticky navbar.
 * Run: pnpm --filter api run test:public-hero-layout
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PUBLIC_DETAIL_HERO_CONTENT_CLASS,
  PUBLIC_DETAIL_HERO_SECTION_CLASS,
  PUBLIC_RENTAL_HERO_CONTENT_CLASS,
  PUBLIC_RENTAL_HERO_SECTION_CLASS,
} from './publicHeroLayout';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const WEB_ROOT = resolve(process.cwd(), '../web');
const read = (rel: string) => readFileSync(resolve(WEB_ROOT, rel), 'utf8');
const tokens = (cls: string) => cls.split(/\s+/);

for (const [name, section, content] of [
  ['detail', PUBLIC_DETAIL_HERO_SECTION_CLASS, PUBLIC_DETAIL_HERO_CONTENT_CLASS],
  ['rental', PUBLIC_RENTAL_HERO_SECTION_CLASS, PUBLIC_RENTAL_HERO_CONTENT_CLASS],
] as const) {
  const s = tokens(section);
  const c = tokens(content);
  assert(!s.some((t) => /^(\w+:)?(h|max-h)-\[/.test(t)), `${name} hero: no fixed / max height (content can grow)`);
  assert(s.some((t) => t.startsWith('min-h-[max(')), `${name} hero: keeps its previous visual height as a minimum`);
  assert(s.includes('flex') && s.includes('flex-col'), `${name} hero: flex column`);
  assert(c.includes('flex-1') && c.includes('justify-end') && !c.includes('h-full'), `${name} hero content: fills the hero, bottom-anchored, not h-full`);
}

const HEROES = [
  ['components/gastro/GastroLocationHero.tsx', 'PUBLIC_DETAIL_HERO'],
  ['components/events/EventHeroPremium.tsx', 'PUBLIC_DETAIL_HERO'],
  ['components/hotel/HotelPublicHero.tsx', 'PUBLIC_DETAIL_HERO'],
  ['components/excursions/ExcursionProductHero.tsx', 'PUBLIC_DETAIL_HERO'],
  ['components/rentals/RentalProductHero.tsx', 'PUBLIC_RENTAL_HERO'],
] as const;

for (const [file, prefix] of HEROES) {
  const src = read(file);
  assert(
    src.includes(`className={${prefix}_SECTION_CLASS}`) && src.includes(`className={${prefix}_CONTENT_CLASS}`),
    `${file} uses the shared hero layout`,
  );
  assert(
    !/h-\[(34|40|50)vh\]|max-h-\[360px\]|h-full flex-col justify-end/.test(src),
    `${file} has no fixed-height / clipped hero left`,
  );
}

const navbar = read('components/Navbar.tsx');
assert(/className="sticky top-0 /.test(navbar), 'navbar is sticky (in flow): page content always starts below it');

const css = read('styles/globals.css');
assert(/scroll-padding-top:\s*var\(--public-navbar-height\)/.test(css), 'anchors keep the shared navbar height token');

const layout = read('app/layout.tsx');
if (/viewportFit|viewport-fit/.test(layout)) {
  assert(/safe-area-inset-top/.test(navbar), 'viewport-fit=cover requires the navbar to absorb safe-area-inset-top');
} else {
  console.log('OK: no viewport-fit=cover → browser keeps content out of the notch (no extra safe-area offset)');
}

console.log('OK: public hero layout');
