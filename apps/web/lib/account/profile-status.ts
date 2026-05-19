/**
 * Profile status determination from availableProfiles.
 * Maps API shape to UI states: available | pending | unavailable
 */
import type { MeAvailableProfiles, MeProfileSummary } from '@/repositories/interfaces';

export type ProfileKind = 'tickets' | 'producer' | 'gastro' | 'hotel' | 'referrer';

export type ProfileStatus = 'available' | 'pending' | 'unavailable';

export interface ProfileStatusInfo {
  status: ProfileStatus;
  hasAccess: boolean;
  profiles: MeProfileSummary[];
  /** True if user has applied and is waiting for approval */
  hasPendingApplication: boolean;
}

function getProfilesForKind(
  available: MeAvailableProfiles | undefined,
  kind: Exclude<ProfileKind, 'tickets'>
): { hasAccess: boolean; profiles: MeProfileSummary[] } {
  if (!available) return { hasAccess: false, profiles: [] };
  const block =
    kind === 'producer'
      ? available.producer
      : kind === 'gastro'
        ? available.gastro
        : kind === 'hotel'
          ? available.hotel
          : available.referrer;
  if (!block) return { hasAccess: false, profiles: [] };
  return {
    hasAccess: !!block.hasAccess,
    profiles: block.profiles ?? [],
  };
}

/**
 * Determine status for a business profile (producer, gastro, referrer).
 * - available: user has active access
 * - pending: has profiles with status PENDING (applied, awaiting approval)
 * - unavailable: no access, can request/apply
 */
export function getProfileStatusInfo(
  available: MeAvailableProfiles | undefined,
  kind: Exclude<ProfileKind, 'tickets'>
): ProfileStatusInfo {
  const { hasAccess, profiles } = getProfilesForKind(available, kind);
  const pendingProfiles = profiles.filter((p) => (p.status ?? '').toUpperCase() === 'PENDING');
  const hasPendingApplication = pendingProfiles.length > 0;

  let status: ProfileStatus;
  if (hasAccess) {
    status = 'available';
  } else if (hasPendingApplication) {
    status = 'pending';
  } else {
    status = 'unavailable';
  }

  return {
    status,
    hasAccess,
    profiles,
    hasPendingApplication,
  };
}

/** Tickets profile is always available to authenticated users */
export function getTicketsProfileStatus(): ProfileStatusInfo {
  return {
    status: 'available',
    hasAccess: true,
    profiles: [],
    hasPendingApplication: false,
  };
}
