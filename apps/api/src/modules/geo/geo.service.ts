import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  cityLabelFromValue,
  ErrorCode,
  provinceLabelFromValue,
  type GeoConfidence,
  type ResolveAddressBody,
  type ResolveAddressResponse,
} from '@yo-te-invito/shared';
import { AuditService } from '../audit/audit.service';
import { isGeocodingConfigured, resolveGoogleGeocodingApiKey } from './maps-config';

type GeocodeCacheEntry = {
  result: ResolveAddressResponse;
  expiresAt: number;
};

type RateBucket = {
  count: number;
  windowStart: number;
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;

function normalizePart(value: string): string {
  return value
    .trim()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ');
}

function buildQuery(body: ResolveAddressBody): string {
  const city = normalizePart(cityLabelFromValue(body.city) || body.city);
  const province = normalizePart(provinceLabelFromValue(body.province) || body.province);
  const address = normalizePart(body.address);
  const country = normalizePart(body.country || 'Argentina');
  return [address, city, province, country].filter(Boolean).join(', ');
}

function cacheKey(body: ResolveAddressBody): string {
  return buildQuery(body).toLowerCase();
}

type GoogleGeocodeResult = {
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  partial_match?: boolean;
  place_id?: string;
};

type GoogleGeocodeResponse = {
  status: string;
  results?: GoogleGeocodeResult[];
  error_message?: string;
};

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly cache = new Map<string, GeocodeCacheEntry>();
  private readonly rateByUser = new Map<string, RateBucket>();

  constructor(private readonly audit: AuditService) {}

  private assertRateLimit(userId: string): void {
    const now = Date.now();
    const bucket = this.rateByUser.get(userId);
    if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
      this.rateByUser.set(userId, { count: 1, windowStart: now });
      return;
    }
    bucket.count += 1;
    if (bucket.count > RATE_LIMIT_MAX) {
      throw new HttpException(
        {
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Demasiadas consultas de ubicación. Esperá un momento e intentá de nuevo.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private readCache(key: string): ResolveAddressResponse | null {
    const hit = this.cache.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return hit.result;
  }

  private writeCache(key: string, result: ResolveAddressResponse): void {
    this.cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  private confidenceFromResults(results: GoogleGeocodeResult[]): GeoConfidence {
    if (results.length === 0) return 'LOW';
    const first = results[0]!;
    if (!first.partial_match && results.length === 1) return 'HIGH';
    if (first.partial_match) return 'MEDIUM';
    return 'LOW';
  }

  async resolveAddress(
    tenantId: string,
    userId: string,
    userRole: string,
    body: ResolveAddressBody,
  ): Promise<ResolveAddressResponse> {
    if (!body.address?.trim() || !body.city?.trim() || !body.province?.trim()) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Completá dirección, ciudad y provincia antes de ubicar en el mapa',
      });
    }

    this.assertRateLimit(userId);

    const key = cacheKey(body);
    const cached = this.readCache(key);
    if (cached) {
      return cached;
    }

    const apiKey = resolveGoogleGeocodingApiKey();
    if (!apiKey) {
      throw new ServiceUnavailableException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Geocoding no configurado en el servidor',
      });
    }

    const addressQuery = buildQuery(body);
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', addressQuery);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('region', 'ar');
    url.searchParams.set('language', 'es');

    let payload: GoogleGeocodeResponse;
    try {
      const res = await fetch(url.toString(), { method: 'GET' });
      payload = (await res.json()) as GoogleGeocodeResponse;
    } catch (err) {
      this.logger.warn(`Geocoding fetch failed: ${err instanceof Error ? err.message : err}`);
      throw new ServiceUnavailableException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'No pudimos consultar el servicio de mapas. Intentá más tarde.',
      });
    }

    const status = payload.status;
    if (status === 'ZERO_RESULTS') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message:
          'No pudimos encontrar la dirección. Revisá calle, altura, ciudad y provincia.',
      });
    }
    if (status === 'OVER_QUERY_LIMIT') {
      throw new HttpException(
        {
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Límite de consultas de mapas alcanzado. Intentá más tarde.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (status === 'REQUEST_DENIED' || status === 'INVALID_REQUEST') {
      this.logger.error(`Geocoding denied: ${payload.error_message ?? status}`);
      throw new ServiceUnavailableException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Servicio de mapas no disponible',
      });
    }
    if (status !== 'OK' || !payload.results?.length) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'No pudimos resolver la dirección',
      });
    }

    const results = payload.results;
    const confidence = this.confidenceFromResults(results);
    if (results.length > 1 && confidence === 'LOW') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message:
          'La dirección es ambigua. Agregá más detalle (altura, barrio o referencia) e intentá de nuevo.',
      });
    }

    const top = results[0]!;
    const lat = top.geometry?.location?.lat;
    const lng = top.geometry?.location?.lng;
    if (lat == null || lng == null) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'No pudimos obtener coordenadas para esta dirección',
      });
    }

    const response: ResolveAddressResponse = {
      lat,
      lng,
      formattedAddress: top.formatted_address ?? addressQuery,
      provider: 'google',
      confidence,
      placeId: top.place_id ?? null,
    };

    this.writeCache(key, response);

    await this.audit.logAction({
      tenantId,
      actorId: userId,
      actorRole: userRole,
      action: 'GEO_ADDRESS_RESOLVED',
      entityType: 'GeoAddress',
      entityId: key.slice(0, 120),
      metadata: {
        context: body.context,
        confidence,
        query: addressQuery,
      },
    });

    return response;
  }
}
