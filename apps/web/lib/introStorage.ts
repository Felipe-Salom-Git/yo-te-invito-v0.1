/**
 * Intro visibility persistence.
 * Key: yti_intro_last_seen
 * Show intro: first visit OR > 24h since last seen.
 */

const KEY = 'yti_intro_last_seen';
const MS_24H = 24 * 60 * 60 * 1000;

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getLastSeen(): number | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(KEY);
    if (raw == null) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function setLastSeen(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function clearLastSeen(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Alias for clearLastSeen (spec compatibility) */
export const clearIntroSeen = clearLastSeen;

export function shouldShowIntro(): boolean {
  const lastSeen = getLastSeen();
  if (lastSeen == null) return true;
  return Date.now() - lastSeen > MS_24H;
}
