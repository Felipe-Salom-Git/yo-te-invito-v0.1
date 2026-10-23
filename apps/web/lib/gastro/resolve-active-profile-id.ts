type LocationRef = { id: string; status: string };

/**
 * `?profileId=` wins when it belongs to the account.
 * Otherwise a remembered id (same account) wins over the first ACTIVE,
 * so leaving a screen that dropped the query does not jump back to local A.
 */
export function resolveActiveGastroProfileId(
  profileIdFromUrl: string | undefined,
  locations: readonly LocationRef[],
  rememberedProfileId?: string,
): string | undefined {
  if (profileIdFromUrl && locations.some((l) => l.id === profileIdFromUrl)) {
    return profileIdFromUrl;
  }
  if (rememberedProfileId && locations.some((l) => l.id === rememberedProfileId)) {
    return rememberedProfileId;
  }
  const active = locations.find((l) => l.status === 'ACTIVE');
  if (active) return active.id;
  return locations[0]?.id;
}
