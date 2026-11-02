/**
 * G12.1-D — Label of the per-local view metric in /gastro/local.
 * Run: pnpm --filter api run test:gastro-local-view-count
 */
import { formatGastroLocationViews } from './gastroLocationViews';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

assert(formatGastroLocationViews(1245) === '1.245 visualizaciones', 'thousands separator es-AR');
assert(formatGastroLocationViews(1) === '1 visualización', 'singular');
assert(formatGastroLocationViews(0) === '0 visualizaciones', 'zero');
assert(formatGastroLocationViews(undefined) === '0 visualizaciones', 'missing → 0');

console.log('OK: gastro local view label');
