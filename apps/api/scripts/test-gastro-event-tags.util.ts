/**
 * G2.3 — Gastro tags reuse ContentTag/EventTag with gastro categoryScope validation.
 * Run: pnpm --filter api run test:gastro-event-tags
 */

import { MAX_CONTENT_TAGS_PER_PUBLICATION } from '@yo-te-invito/shared';
import {
  mapEventTagsPublic,
  syncGastroPublicEventTags,
  validateEventTagIds,
} from '../src/common/event-tags.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

type MockPrisma = {
  contentTag: {
    findMany: (args: {
      where: {
        id: { in: string[] };
        tenantId: string;
        isActive: boolean;
        OR?: Array<{ categoryScope: null } | { categoryScope: string }>;
      };
    }) => Promise<Array<{ id: string; name: string; slug: string }>>;
  };
  eventTag: {
    deleteMany: (args: { where: { eventId: string } }) => Promise<{ count: number }>;
    createMany: (args: {
      data: Array<{ eventId: string; tagId: string }>;
    }) => Promise<{ count: number }>;
  };
};

function mockPrisma(opts: {
  validIds: string[];
  deleted?: string[];
  created?: Array<{ eventId: string; tagId: string }>;
}): MockPrisma {
  return {
    contentTag: {
      findMany: async ({ where }) => {
        assert(where.tenantId === 'tenant-1', 'tag validate uses tenant');
        assert(where.isActive === true, 'tag validate requires active');
        const scopes = where.OR ?? [];
        const allowsGastro = scopes.some(
          (s) => 'categoryScope' in s && (s.categoryScope === null || s.categoryScope === 'gastro'),
        );
        assert(allowsGastro, 'tag validate allows global + gastro scope');
        return opts.validIds
          .filter((id) => where.id.in.includes(id))
          .map((id) => ({ id, name: id, slug: id }));
      },
    },
    eventTag: {
      deleteMany: async ({ where }) => {
        opts.deleted?.push(where.eventId);
        return { count: 1 };
      },
      createMany: async ({ data }) => {
        opts.created?.push(...data);
        return { count: data.length };
      },
    },
  };
}

async function run() {
  const accepted = await validateEventTagIds(
    mockPrisma({ validIds: ['pet', 'vegano'] }) as never,
    'tenant-1',
    'gastro',
    ['pet', 'vegano'],
  );
  assert(JSON.stringify(accepted) === JSON.stringify(['pet', 'vegano']), 'accepts gastro tags');

  let rejected = false;
  try {
    await validateEventTagIds(
      mockPrisma({ validIds: ['pet'] }) as never,
      'tenant-1',
      'gastro',
      ['pet', 'hotel-only'],
    );
  } catch {
    rejected = true;
  }
  assert(rejected, 'rejects tags outside gastro/global scope');

  const tooMany = Array.from({ length: MAX_CONTENT_TAGS_PER_PUBLICATION + 1 }, (_, i) => `t${i}`);
  let capped = false;
  try {
    await validateEventTagIds(
      mockPrisma({ validIds: tooMany }) as never,
      'tenant-1',
      'gastro',
      tooMany,
    );
  } catch {
    capped = true;
  }
  assert(capped, 'enforces max tags per publication');

  const deleted: string[] = [];
  const created: Array<{ eventId: string; tagId: string }> = [];
  await syncGastroPublicEventTags(
    mockPrisma({ validIds: ['terraza'], deleted, created }) as never,
    'tenant-1',
    'event-gastro-1',
    ['terraza'],
  );
  assert(deleted[0] === 'event-gastro-1', 'sync clears EventTag for public event');
  assert(
    JSON.stringify(created) === JSON.stringify([{ eventId: 'event-gastro-1', tagId: 'terraza' }]),
    'sync writes EventTag rows (no GastroProfileTag)',
  );

  const mapped = mapEventTagsPublic([
    { tag: { id: '1', name: 'Vegano', slug: 'vegano', isActive: true } },
    { tag: { id: '2', name: 'Hidden', slug: 'hidden', isActive: false } },
  ]);
  assert(mapped.length === 1 && mapped[0]?.slug === 'vegano', 'public map skips inactive tags');

  console.log('\nAll G2.3 gastro event-tag checks passed.');
}

void run();
