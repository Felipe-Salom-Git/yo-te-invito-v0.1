/**
 * Unit checks for public trending sort + visibility interaction.
 * Run: pnpm --filter api run test:event-trending
 */

import {
  compareTrendingEvents,
  TRENDING_PRISMA_ORDER_BY,
} from '../src/common/utils/event-trending.util';
import {
  getEventPublicVisibleUntil,
  isEventPubliclyVisible,
} from '../src/common/utils/event-public-visibility.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const d = (iso: string) => new Date(iso);

assert(TRENDING_PRISMA_ORDER_BY.length === 4, 'orderBy has 4 keys');
assert(
  TRENDING_PRISMA_ORDER_BY[0]?.viewCount === 'desc',
  'first sort is viewCount desc',
);

const highViews = {
  viewCount: 100,
  rankingScore: 1,
  startAt: d('2026-12-01'),
  createdAt: d('2026-01-01'),
};
const lowViews = {
  viewCount: 1,
  rankingScore: 10,
  startAt: d('2026-06-01'),
  createdAt: d('2026-05-01'),
};
assert(compareTrendingEvents(highViews, lowViews) < 0, 'more views ranks first');

const tieViewsA = {
  viewCount: 10,
  rankingScore: 9,
  startAt: d('2026-08-01'),
  createdAt: d('2026-01-01'),
};
const tieViewsB = {
  viewCount: 10,
  rankingScore: 5,
  startAt: d('2026-06-01'),
  createdAt: d('2026-02-01'),
};
assert(compareTrendingEvents(tieViewsA, tieViewsB) < 0, 'tie views: higher rankingScore first');

const tieRankA = {
  viewCount: 5,
  rankingScore: 8,
  startAt: d('2026-07-01'),
  createdAt: d('2026-03-01'),
};
const tieRankB = {
  viewCount: 5,
  rankingScore: 8,
  startAt: d('2026-09-01'),
  createdAt: d('2026-04-01'),
};
assert(compareTrendingEvents(tieRankA, tieRankB) < 0, 'tie rank: earlier startAt first');

const zeroViews = {
  viewCount: 0,
  rankingScore: null,
  startAt: d('2026-10-01'),
  createdAt: d('2026-05-01'),
};
assert(
  compareTrendingEvents(highViews, zeroViews) < 0,
  'zero views can rank below high views',
);

const eventStart = d('2026-05-20T22:00:00.000Z');
const afterGrace = d('2026-05-22T06:00:00.000Z');
assert(
  !isEventPubliclyVisible(eventStart, 'event', afterGrace),
  'timed event past 1AM day-after is not visible',
);
assert(
  isEventPubliclyVisible(eventStart, 'event', d('2026-05-21T02:00:00.000Z')),
  'timed event still visible before 1AM day-after (AR)',
);
assert(
  getEventPublicVisibleUntil(eventStart).getTime() > eventStart.getTime(),
  'visible-until is after start',
);

console.log('OK: event-trending + visibility checks passed');
