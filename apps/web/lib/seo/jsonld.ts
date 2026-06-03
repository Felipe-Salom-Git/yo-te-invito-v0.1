export type JsonLdNode = Record<string, unknown>;

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function toIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  // API returns ISO strings already; keep as-is.
  return value;
}

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function pickNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function buildAggregateRating(input: {
  ratingValue: number | null;
  ratingCount: number | null;
}): JsonLdNode | null {
  const ratingValue = input.ratingValue != null && input.ratingValue > 0 ? input.ratingValue : null;
  const ratingCount = input.ratingCount != null && input.ratingCount > 0 ? input.ratingCount : null;
  if (ratingValue == null || ratingCount == null) return null;
  return {
    '@type': 'AggregateRating',
    ratingValue,
    ratingCount,
  };
}

export function buildEventJsonLd(input: {
  url: string;
  name: string;
  description?: string | null;
  image?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  city?: string | null;
  province?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  producer?: { displayName?: string | null; id?: string | null; slug?: string | null } | null;
  fromPrice?: number | null;
  currency?: string;
}): JsonLdNode {
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: input.name,
    url: input.url,
  };

  const description = input.description ? stripHtml(input.description) : null;
  if (description) node.description = description.slice(0, 3000);

  const image = pickString(input.image);
  if (image) node.image = [image];

  const startDate = toIso(input.startAt);
  if (startDate) node.startDate = startDate;

  const endDate = toIso(input.endAt);
  if (endDate) node.endDate = endDate;

  // Location (Place) only when we have at least a name/address.
  const placeName = pickString(input.venueName) ?? pickString(input.city);
  const address = pickString(input.venueAddress);
  if (placeName || address || (input.geoLat != null && input.geoLng != null)) {
    const place: JsonLdNode = { '@type': 'Place' };
    if (placeName) place.name = placeName;
    if (address || input.city || input.province) {
      const postal: JsonLdNode = { '@type': 'PostalAddress' };
      if (address) postal.streetAddress = address;
      if (input.city) postal.addressLocality = input.city;
      if (input.province) postal.addressRegion = input.province;
      postal.addressCountry = 'AR';
      place.address = postal;
    }
    if (input.geoLat != null && input.geoLng != null) {
      place.geo = { '@type': 'GeoCoordinates', latitude: input.geoLat, longitude: input.geoLng };
    }
    node.location = place;
  }

  // Organizer (Organization) when we have a display name.
  const organizerName = pickString(input.producer?.displayName);
  if (organizerName) {
    node.organizer = { '@type': 'Organization', name: organizerName };
  }

  // Offers only when price is explicitly available and meaningful.
  const price = pickNumber(input.fromPrice);
  if (price != null && price > 0) {
    node.offers = {
      '@type': 'Offer',
      url: input.url,
      price,
      priceCurrency: input.currency ?? 'ARS',
    };
  }

  return node;
}

export function buildProducerJsonLd(input: {
  url: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  city?: string | null;
  country?: string | null;
}): JsonLdNode {
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
  };

  const description = input.description ? stripHtml(input.description) : null;
  if (description) node.description = description.slice(0, 3000);

  const logo = pickString(input.logoUrl);
  if (logo) node.logo = logo;

  const image = pickString(input.imageUrl);
  if (image) node.image = [image];

  const sameAs = [pickString(input.websiteUrl), pickString(input.instagramUrl)].filter(
    (x): x is string => Boolean(x),
  );
  if (sameAs.length > 0) node.sameAs = sameAs;

  if (input.city || input.country) {
    const postal: JsonLdNode = { '@type': 'PostalAddress' };
    if (input.city) postal.addressLocality = input.city;
    if (input.country) postal.addressCountry = input.country;
    else if (input.city) postal.addressCountry = 'AR';
    node.address = postal;
  }

  return node;
}

export function buildGastroJsonLd(input: {
  url: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  websiteUrl?: string | null;
  menuUrl?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
}): JsonLdNode {
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: input.name,
    url: input.url,
  };

  const description = input.description ? stripHtml(input.description) : null;
  if (description) node.description = description.slice(0, 3000);

  const image = pickString(input.imageUrl);
  if (image) node.image = [image];

  const logo = pickString(input.logoUrl);
  if (logo) node.logo = logo;

  if (input.address || input.city || input.province) {
    const postal: JsonLdNode = { '@type': 'PostalAddress' };
    if (input.address) postal.streetAddress = input.address;
    if (input.city) postal.addressLocality = input.city;
    if (input.province) postal.addressRegion = input.province;
    postal.addressCountry = 'AR';
    node.address = postal;
  }

  if (input.geoLat != null && input.geoLng != null) {
    node.geo = { '@type': 'GeoCoordinates', latitude: input.geoLat, longitude: input.geoLng };
  }

  const sameAs = [pickString(input.websiteUrl), pickString(input.menuUrl)].filter(
    (x): x is string => Boolean(x),
  );
  if (sameAs.length > 0) node.sameAs = sameAs;

  const agg = buildAggregateRating({
    ratingValue: pickNumber(input.ratingAvg),
    ratingCount: typeof input.ratingCount === 'number' ? input.ratingCount : null,
  });
  if (agg) node.aggregateRating = agg;

  return node;
}

export function buildHotelJsonLd(input: {
  url: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  websiteUrl?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
}): JsonLdNode {
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: input.name,
    url: input.url,
  };

  const description = input.description ? stripHtml(input.description) : null;
  if (description) node.description = description.slice(0, 3000);

  const image = pickString(input.imageUrl);
  if (image) node.image = [image];

  const logo = pickString(input.logoUrl);
  if (logo) node.logo = logo;

  if (input.address || input.city || input.province) {
    const postal: JsonLdNode = { '@type': 'PostalAddress' };
    if (input.address) postal.streetAddress = input.address;
    if (input.city) postal.addressLocality = input.city;
    if (input.province) postal.addressRegion = input.province;
    postal.addressCountry = 'AR';
    node.address = postal;
  }

  if (input.geoLat != null && input.geoLng != null) {
    node.geo = { '@type': 'GeoCoordinates', latitude: input.geoLat, longitude: input.geoLng };
  }

  const website = pickString(input.websiteUrl);
  if (website) node.sameAs = [website];

  const agg = buildAggregateRating({
    ratingValue: pickNumber(input.ratingAvg),
    ratingCount: typeof input.ratingCount === 'number' ? input.ratingCount : null,
  });
  if (agg) node.aggregateRating = agg;

  return node;
}

