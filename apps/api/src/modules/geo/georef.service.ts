import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ErrorCode, type GeoLocalityOption, type GeoProvinceOption } from '@yo-te-invito/shared';

const GEOREF_BASE = 'https://apis.datos.gob.ar/georef/api';
const PROVINCES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LOCALITIES_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type GeorefProvinceRow = {
  id?: string;
  nombre?: string;
};

type GeorefLocalityRow = {
  id?: string;
  nombre?: string;
  provincia?: { id?: string; nombre?: string };
};

type GeorefProvincesPayload = {
  provincias?: GeorefProvinceRow[];
};

type GeorefLocalitiesPayload = {
  localidades?: GeorefLocalityRow[];
};

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

function dedupeById<T extends { id: string; name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = item.id || item.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

@Injectable()
export class GeoRefService {
  private readonly logger = new Logger(GeoRefService.name);
  private provincesCache: CacheEntry<GeoProvinceOption[]> | null = null;
  private readonly localitiesCache = new Map<string, CacheEntry<GeoLocalityOption[]>>();

  async listProvinces(): Promise<GeoProvinceOption[]> {
    const cached = this.readProvincesCache();
    if (cached) return cached;

    const url = new URL(`${GEOREF_BASE}/provincias`);
    url.searchParams.set('campos', 'id,nombre');
    url.searchParams.set('max', '100');

    let payload: GeorefProvincesPayload;
    try {
      const res = await fetch(url.toString(), { method: 'GET' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      payload = (await res.json()) as GeorefProvincesPayload;
    } catch (err) {
      this.logger.warn(
        `Georef provinces fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'No pudimos cargar las provincias. Intentá de nuevo en unos minutos.',
      });
    }

    const provinces = sortByName(
      dedupeById(
        (payload.provincias ?? [])
          .map((row) => {
            const id = row.id?.trim();
            const name = normalizeName(row.nombre ?? '');
            if (!id || !name) return null;
            return { id, name };
          })
          .filter((x): x is GeoProvinceOption => x != null),
      ),
    );

    this.writeProvincesCache(provinces);
    return provinces;
  }

  async listLocalities(province: string): Promise<GeoLocalityOption[]> {
    const provinceName = normalizeName(province);
    if (!provinceName) {
      return [];
    }

    const cacheKey = provinceName.toLowerCase();
    const cached = this.readLocalitiesCache(cacheKey);
    if (cached) return cached;

    const url = new URL(`${GEOREF_BASE}/localidades`);
    url.searchParams.set('provincia', provinceName);
    url.searchParams.set('campos', 'id,nombre,provincia');
    url.searchParams.set('max', '5000');

    let payload: GeorefLocalitiesPayload;
    try {
      const res = await fetch(url.toString(), { method: 'GET' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      payload = (await res.json()) as GeorefLocalitiesPayload;
    } catch (err) {
      this.logger.warn(
        `Georef localities fetch failed for "${provinceName}": ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'No pudimos cargar las localidades. Intentá de nuevo en unos minutos.',
      });
    }

    const mapped: GeoLocalityOption[] = [];
    for (const row of payload.localidades ?? []) {
      const id = row.id?.trim();
      const name = normalizeName(row.nombre ?? '');
      if (!id || !name) continue;
      mapped.push({
        id,
        name,
        provinceId: row.provincia?.id?.trim() || undefined,
        provinceName: row.provincia?.nombre ? normalizeName(row.provincia.nombre) : undefined,
      });
    }

    const localities = sortByName(dedupeById(mapped));

    this.writeLocalitiesCache(cacheKey, localities);
    return localities;
  }

  private readProvincesCache(): GeoProvinceOption[] | null {
    if (!this.provincesCache) return null;
    if (Date.now() > this.provincesCache.expiresAt) {
      this.provincesCache = null;
      return null;
    }
    return this.provincesCache.value;
  }

  private writeProvincesCache(value: GeoProvinceOption[]): void {
    this.provincesCache = { value, expiresAt: Date.now() + PROVINCES_CACHE_TTL_MS };
  }

  private readLocalitiesCache(key: string): GeoLocalityOption[] | null {
    const hit = this.localitiesCache.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      this.localitiesCache.delete(key);
      return null;
    }
    return hit.value;
  }

  private writeLocalitiesCache(key: string, value: GeoLocalityOption[]): void {
    this.localitiesCache.set(key, { value, expiresAt: Date.now() + LOCALITIES_CACHE_TTL_MS });
  }
}
