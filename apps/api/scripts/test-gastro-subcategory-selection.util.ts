/**
 * G2.2 — Portal gastro multi-subcategory selection + tenant/category validation.
 * Run: pnpm --filter api run test:gastro-subcategory-selection
 */

import { resolveGastroSubcategorySelection } from '@yo-te-invito/shared';
import {
  resolveValidatedGastroSubcategories,
  validateGastroSubcategoryIds,
} from '../src/common/event-subcategories.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const selection = resolveGastroSubcategorySelection({
  subcategoryId: 'primary',
  subcategoryIds: ['secondary', 'primary', 'tertiary'],
});
assert(selection?.primaryId === 'primary', 'explicit primary kept');
assert(
  JSON.stringify(selection?.allIds) === JSON.stringify(['primary', 'secondary', 'tertiary']),
  'primary ordered first + deduped',
);

const firstWins = resolveGastroSubcategorySelection({
  subcategoryIds: ['a', 'b'],
});
assert(firstWins?.primaryId === 'a', 'first selected is primary when no subcategoryId');

type MockPrisma = {
  contentSubcategory: {
    findMany: (args: {
      where: { id: { in: string[] }; tenantId: string; category: string; isActive: boolean };
    }) => Promise<Array<{ id: string }>>;
  };
};

function mockPrisma(validIds: string[]): MockPrisma {
  return {
    contentSubcategory: {
      findMany: async ({ where }) => {
        assert(where.tenantId === 'tenant-1', 'validates against tenant');
        assert(where.category === 'gastro', 'validates gastro category only');
        assert(where.isActive === true, 'requires active catalog rows');
        return validIds
          .filter((id) => where.id.in.includes(id))
          .map((id) => ({ id }));
      },
    },
  };
}

async function runAsync() {
  const ok = await validateGastroSubcategoryIds(
    mockPrisma(['g1', 'g2']) as never,
    'tenant-1',
    ['g1', 'g2'],
  );
  assert(JSON.stringify(ok) === JSON.stringify(['g1', 'g2']), 'accepts active gastro ids');

  let rejected = false;
  try {
    await validateGastroSubcategoryIds(
      mockPrisma(['g1']) as never,
      'tenant-1',
      ['g1', 'not-gastro'],
    );
  } catch {
    rejected = true;
  }
  assert(rejected, 'rejects ids outside gastro catalog');

  const resolved = await resolveValidatedGastroSubcategories(
    mockPrisma(['g1', 'g2']) as never,
    'tenant-1',
    { subcategoryId: 'g2', subcategoryIds: ['g1', 'g2'] },
  );
  assert(resolved?.primaryId === 'g2', 'validated primary matches selection');
  assert(
    JSON.stringify(resolved?.allIds) === JSON.stringify(['g2', 'g1']),
    'validated allIds keep primary first',
  );

  console.log('\nAll G2.2 gastro subcategory selection checks passed.');
}

void runAsync();
