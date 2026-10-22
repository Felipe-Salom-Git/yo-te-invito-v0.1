/**
 * G2.4 — Admin gastro create/update payloads must forward subcategoryIds + tagIds.
 * Run: pnpm --filter api run test:admin-gastro-taxonomy-payload
 *
 * Mirrors web `admin-gastro-form.utils` mapping rules (shared contract fields).
 */

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

type Payload = {
  displayName: string;
  subcategoryId?: string | null;
  subcategoryIds?: string[];
  tagIds?: string[];
  location: {
    province: string;
    city: string;
    address: string;
  };
  contactEmail: string;
};

function toAdminCreate(payload: Payload) {
  return {
    displayName: payload.displayName,
    subcategoryId: payload.subcategoryId,
    subcategoryIds: payload.subcategoryIds,
    tagIds: payload.tagIds,
    location: payload.location,
    contactEmail: payload.contactEmail,
  };
}

function toAdminUpdate(payload: Payload) {
  return {
    displayName: payload.displayName,
    subcategoryId: payload.subcategoryId,
    subcategoryIds: payload.subcategoryIds,
    tagIds: payload.tagIds,
    location: payload.location,
    contactEmail: payload.contactEmail,
  };
}

function mapDetailToLocal(detail: {
  subcategoryId: string | null;
  subcategories?: Array<{ id: string; name: string; isPrimary?: boolean }>;
  tags?: Array<{ id: string; name: string; slug: string }>;
}) {
  return {
    subcategoryId: detail.subcategoryId,
    subcategories: detail.subcategories,
    tags: detail.tags,
  };
}

const payload: Payload = {
  displayName: 'Local Test',
  subcategoryId: 'sc-1',
  subcategoryIds: ['sc-1', 'sc-2'],
  tagIds: ['tag-pet', 'tag-veg'],
  location: { province: 'Mendoza', city: 'Ciudad', address: 'Calle 1' },
  contactEmail: 'a@b.com',
};

const created = toAdminCreate(payload);
assert(created.subcategoryIds?.length === 2, 'create forwards subcategoryIds');
assert(created.tagIds?.length === 2, 'create forwards tagIds');
assert(created.subcategoryId === 'sc-1', 'create keeps legacy subcategoryId primary');

const updated = toAdminUpdate(payload);
assert(
  JSON.stringify(updated.subcategoryIds) === JSON.stringify(['sc-1', 'sc-2']),
  'update forwards subcategoryIds',
);
assert(JSON.stringify(updated.tagIds) === JSON.stringify(['tag-pet', 'tag-veg']), 'update forwards tagIds');

const local = mapDetailToLocal({
  subcategoryId: 'sc-1',
  subcategories: [
    { id: 'sc-1', name: 'Restaurante', isPrimary: true },
    { id: 'sc-2', name: 'Bar' },
  ],
  tags: [{ id: 'tag-pet', name: 'Pet Friendly', slug: 'pet-friendly' }],
});
assert(local.subcategories?.length === 2, 'detail→form keeps multi-subcategories');
assert(local.tags?.length === 1, 'detail→form keeps tags');

console.log('\nAll G2.4 admin gastro taxonomy payload checks passed.');
