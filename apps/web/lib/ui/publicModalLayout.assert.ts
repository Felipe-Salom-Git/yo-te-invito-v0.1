/**
 * G12.1-B — Public detail modals start below the navbar / safe area on mobile, whatever the
 * content height (no centered flex overflow pushing the title / share above the screen).
 * Run: pnpm --filter api run test:public-modal-top-offset
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PUBLIC_MODAL_PANEL_CLASS, PUBLIC_MODAL_VIEWPORT_CLASS } from './publicModalLayout';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const WEB_ROOT = resolve(process.cwd(), '../web');
const read = (rel: string) => readFileSync(resolve(WEB_ROOT, rel), 'utf8');

const css = read('styles/globals.css');

function ruleBody(source: string, selector: string, from = 0): string {
  const start = source.indexOf(`${selector} {`, from);
  if (start < 0) return '';
  return source.slice(start, source.indexOf('}', start));
}

const mobileViewport = ruleBody(css, `.${PUBLIC_MODAL_VIEWPORT_CLASS}`);
const mobilePanel = ruleBody(css, `.${PUBLIC_MODAL_PANEL_CLASS}`);
const desktopStart = css.indexOf('@media (min-width: 640px)', css.indexOf(`.${PUBLIC_MODAL_VIEWPORT_CLASS} {`));
const desktopViewport = ruleBody(css, `.${PUBLIC_MODAL_VIEWPORT_CLASS}`, desktopStart);

assert(/--public-navbar-height:\s*3\.5rem/.test(css), 'navbar height var matches mobile navbar (h-14)');
assert(/align-items:\s*flex-start/.test(mobileViewport), 'mobile viewport is top-aligned (never centered)');
assert(
  mobileViewport.includes('safe-area-inset-top') && mobileViewport.includes('var(--public-navbar-height)'),
  'mobile top offset = safe area + navbar height',
);
assert(/overflow-y:\s*auto/.test(mobileViewport), 'viewport scrolls instead of clipping');
assert(
  mobilePanel.includes('100dvh') && mobilePanel.includes('var(--public-navbar-height)'),
  'panel max-height derived from visible viewport minus navbar (not content height)',
);
assert(/align-items:\s*center/.test(desktopViewport), 'desktop (sm+) keeps the centered modal');

const PUBLIC_MODALS = [
  'components/home/ContentPreviewModal.tsx',
  'components/ui/Modal.tsx',
  'components/public/PublicDescriptionBlock.tsx',
  'components/events/EventLocationModal.tsx',
  'components/events/discovery/EventCalendarModal.tsx',
  'components/public/producers/ProducerRatingDistributionModal.tsx',
];

for (const file of PUBLIC_MODALS) {
  const src = read(file);
  assert(
    src.includes('PUBLIC_MODAL_VIEWPORT_CLASS') && src.includes('PUBLIC_MODAL_PANEL_CLASS'),
    `${file} uses the shared viewport + panel classes`,
  );
  assert(
    !/fixed inset-0[^"`]*items-center/.test(src) && !src.includes('max-h-[min(90vh,100dvh)]'),
    `${file} has no centered wrapper / content-independent 90vh cap left`,
  );
}

const preview = read('components/home/ContentPreviewModal.tsx');
assert(
  preview.indexOf('id="preview-title"') < preview.indexOf('<PublicShareButton'),
  'preview modal: share stays right under the title',
);

console.log('OK: public modal top offset');
