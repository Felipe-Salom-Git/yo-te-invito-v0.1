/**
 * Reads public profile fields stored in User.preferences JSON.
 * Avatar URL is persisted here (not a dedicated User column).
 */
export function readUserAvatarUrl(preferences: unknown): string | null {
  if (!preferences || typeof preferences !== 'object') return null;
  const value = (preferences as Record<string, unknown>).avatarUrl;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isHttpImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:')) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
