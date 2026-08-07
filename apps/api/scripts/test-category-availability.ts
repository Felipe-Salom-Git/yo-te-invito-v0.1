/**
 * Category availability / preview-role matrix (V3.2 hotfix).
 * Run: pnpm --filter api run test:category-availability
 */

import {
  Role,
  canAccessPublicCategory,
  canPreviewComingSoonCategory,
  getDeniedComingSoonCategories,
  isCategoryComingSoon,
  isCategoryPubliclyAvailable,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

assert(isCategoryComingSoon('event'), 'event is comingSoon');
assert(isCategoryComingSoon('gastro'), 'gastro is comingSoon');
assert(isCategoryPubliclyAvailable('rental'), 'rental is public');
assert(isCategoryPubliclyAvailable('excursion'), 'excursion is public');

const cases: Array<{
  role: string | null;
  category: string;
  allow: boolean;
  label: string;
}> = [
  { role: null, category: 'event', allow: false, label: 'anonymous + event → deny' },
  { role: null, category: 'gastro', allow: false, label: 'anonymous + gastro → deny' },
  { role: Role.USER, category: 'event', allow: false, label: 'USER + event → deny' },
  { role: Role.USER, category: 'gastro', allow: false, label: 'USER + gastro → deny' },
  {
    role: Role.PRODUCER_OWNER,
    category: 'event',
    allow: true,
    label: 'PRODUCER_OWNER + event → allow',
  },
  {
    role: Role.PRODUCER_OWNER,
    category: 'gastro',
    allow: false,
    label: 'PRODUCER_OWNER + gastro → deny',
  },
  {
    role: Role.PRODUCER_STAFF,
    category: 'event',
    allow: true,
    label: 'PRODUCER_STAFF + event → allow',
  },
  {
    role: Role.PRODUCER_STAFF,
    category: 'gastro',
    allow: false,
    label: 'PRODUCER_STAFF + gastro → deny',
  },
  {
    role: Role.GASTRO_OWNER,
    category: 'gastro',
    allow: true,
    label: 'GASTRO_OWNER + gastro → allow',
  },
  {
    role: Role.GASTRO_OWNER,
    category: 'event',
    allow: false,
    label: 'GASTRO_OWNER + event → deny',
  },
  { role: Role.ADMIN, category: 'event', allow: true, label: 'ADMIN + event → allow' },
  { role: Role.ADMIN, category: 'gastro', allow: true, label: 'ADMIN + gastro → allow' },
  { role: null, category: 'rental', allow: true, label: 'anonymous + rental → allow' },
  {
    role: null,
    category: 'excursion',
    allow: true,
    label: 'anonymous + excursion → allow',
  },
  {
    role: Role.HOTEL_OWNER,
    category: 'event',
    allow: false,
    label: 'HOTEL_OWNER + event → deny',
  },
  {
    role: Role.REFERRER,
    category: 'gastro',
    allow: false,
    label: 'REFERRER + gastro → deny',
  },
];

for (const c of cases) {
  assert(canAccessPublicCategory(c.category, c.role) === c.allow, c.label);
}

assert(
  canPreviewComingSoonCategory('event', Role.PRODUCER_OWNER),
  'producer can preview event',
);
assert(
  !canPreviewComingSoonCategory('gastro', Role.PRODUCER_OWNER),
  'producer cannot preview gastro',
);
assert(
  canPreviewComingSoonCategory('gastro', Role.GASTRO_OWNER),
  'gastro owner can preview gastro',
);
assert(!canPreviewComingSoonCategory('event', Role.GASTRO_OWNER), 'gastro cannot preview event');

const deniedAnon = getDeniedComingSoonCategories(null);
assert(deniedAnon.includes('event') && deniedAnon.includes('gastro'), 'anon denied event+gastro');

const deniedProducer = getDeniedComingSoonCategories(Role.PRODUCER_OWNER);
assert(!deniedProducer.includes('event'), 'producer not denied event');
assert(deniedProducer.includes('gastro'), 'producer denied gastro');

const deniedGastro = getDeniedComingSoonCategories(Role.GASTRO_OWNER);
assert(deniedGastro.includes('event'), 'gastro denied event');
assert(!deniedGastro.includes('gastro'), 'gastro not denied gastro');

const deniedAdmin = getDeniedComingSoonCategories(Role.ADMIN);
assert(deniedAdmin.length === 0, 'ADMIN denied none');

console.log('OK: category-availability matrix passed');
