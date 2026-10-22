type LocationRef = { id: string; status: string };

/**
 * `?profileId=` wins when it belongs to the account; otherwise first ACTIVE, then first.
 * `?profileId=` gana si pertenece a la cuenta; si no, primer ACTIVE y luego el primero.
 */
export function resolveActiveGastroProfileId(
  profileIdFromUrl: string | undefined,
  locations: readonly LocationRef[],
): string | undefined {
  if (profileIdFromUrl && locations.some((l) => l.id === profileIdFromUrl)) {
    return profileIdFromUrl;
  }
  const active = locations.find((l) => l.status === 'ACTIVE');
  if (active) return active.id;
  return locations[0]?.id;
}
