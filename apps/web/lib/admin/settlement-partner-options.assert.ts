import {
  adminGastroActiveListQuery,
  mapActivitySettlementPartners,
  mapGastroSettlementPartners,
  resolveSettlementPartnerOptions,
} from './settlement-partner-options';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

assert(adminGastroActiveListQuery().status === 'active', 'status must be lowercase active');
assert(
  mapGastroSettlementPartners([{ id: 'g1', displayName: 'Local A' }])[0]?.label === 'Local A',
  'gastro human label',
);
assert(
  mapActivitySettlementPartners([{ id: 'o1', name: 'Operador X' }])[0]?.label === 'Operador X',
  'activity human label',
);
assert(resolveSettlementPartnerOptions('', [{ id: 'g1', displayName: 'A' }], []).length === 0, 'empty vertical');
assert(
  resolveSettlementPartnerOptions('GASTRO', [{ id: 'g1', displayName: 'A' }], [
    { id: 'o1', name: 'B' },
  ]).length === 1,
  'gastro only',
);
assert(
  resolveSettlementPartnerOptions('ACTIVITY', [{ id: 'g1', displayName: 'A' }], [
    { id: 'o1', name: 'B' },
  ])[0]?.id === 'o1',
  'activity only',
);
assert(mapGastroSettlementPartners(undefined).length === 0, 'empty gastro state');
assert(mapActivitySettlementPartners(null).length === 0, 'empty activity state');

console.log('OK: settlement partner options (tenant-scoped catalogs map by vertical)');
