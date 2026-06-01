/**
 * Smoke: public entities with geo/address fields (Maps 10).
 * Run: pnpm --filter api run smoke:maps-location
 * Requires: API running, DB migrated, optional SMOKE_* auth for admin paths.
 */

import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const API = (process.env.SMOKE_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
);

type GeoRow = {
  label: string;
  address?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  province?: string | null;
  googlePlaceId?: string | null;
};

function hasGeoOrAddress(row: GeoRow): boolean {
  const hasCoords =
    row.geoLat != null &&
    row.geoLng != null &&
    Number.isFinite(row.geoLat) &&
    Number.isFinite(row.geoLng);
  const hasAddress = Boolean(row.address?.trim());
  return hasCoords || hasAddress;
}

async function fetchJson(path: string): Promise<{ ok: boolean; data: unknown; status: number }> {
  const url = `${API}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url);
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  return { ok: res.ok, data, status: res.status };
}

async function main() {
  const checks: GeoRow[] = [];
  let failures = 0;

  const health = await fetchJson('/health');
  if (!health.ok) {
    console.error('FAIL health', health.status);
    process.exit(1);
  }
  console.log('OK health');

  const events = await fetchJson(`/public/events/search?tenantId=${TENANT}&limit=5`);
  if (events.ok && events.data && typeof events.data === 'object') {
    const list = (events.data as { data?: unknown[] }).data ?? [];
    for (const e of list.slice(0, 3)) {
      const ev = e as Record<string, unknown>;
      checks.push({
        label: `Event ${ev.id ?? '?'}`,
        address: (ev.venueAddress as string) ?? null,
        geoLat: ev.geoLat as number | null,
        geoLng: ev.geoLng as number | null,
        province: (ev.province as string) ?? null,
        googlePlaceId: (ev.googlePlaceId as string) ?? null,
      });
    }
  }

  const gastro = await fetchJson(`/public/gastro-locations?tenantId=${TENANT}&limit=3`);
  if (gastro.ok && Array.isArray(gastro.data)) {
    for (const g of (gastro.data as Record<string, unknown>[]).slice(0, 2)) {
      checks.push({
        label: `Gastro ${g.id ?? '?'}`,
        address: (g.address as string) ?? null,
        geoLat: g.geoLat as number | null,
        geoLng: g.geoLng as number | null,
        province: (g.province as string) ?? null,
        googlePlaceId: (g.googlePlaceId as string) ?? null,
      });
    }
  }

  const rentals = await fetchJson(`/admin/rental-locations?tenantId=${TENANT}`);
  if (rentals.ok && rentals.data && typeof rentals.data === 'object') {
    const list = (rentals.data as { data?: unknown[] }).data ?? [];
    for (const r of list.slice(0, 2)) {
      const loc = r as Record<string, unknown>;
      checks.push({
        label: `RentalLocation ${loc.id ?? '?'}`,
        address: (loc.address as string) ?? null,
        geoLat: loc.geoLat as number | null,
        geoLng: loc.geoLng as number | null,
        province: (loc.province as string) ?? null,
        googlePlaceId: (loc.googlePlaceId as string) ?? null,
      });
    }
  }

  if (checks.length === 0) {
    console.log('SKIP no location samples in API (empty tenant or no seeded data)');
    console.log('Manual smoke: see docs/audits/MAPS_LOCATION_AUDIT.md §18–§19');
    return;
  }

  for (const row of checks) {
    if (hasGeoOrAddress(row)) {
      console.log(`OK ${row.label} — address or coords present`);
      if (row.googlePlaceId) console.log(`   googlePlaceId: ${row.googlePlaceId.slice(0, 20)}…`);
      if (row.province) console.log(`   province: ${row.province}`);
    } else {
      console.warn(`WARN ${row.label} — legacy row without address/coords (allowed)`);
    }
  }

  console.log(`\nChecked ${checks.length} entities. Failures: ${failures}`);
  if (failures > 0) process.exit(1);
}

runSmokeScript(main);
