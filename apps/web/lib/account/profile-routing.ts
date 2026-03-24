/**
 * Profile-based routing: where to send user when they select a profile.
 */
import type { ProfileStatusInfo } from './profile-status';
import type { ProfileOption } from './profile-options';

/**
 * Get the destination route when user selects a profile.
 */
export function getProfileDestinationRoute(
  option: ProfileOption,
  statusInfo: ProfileStatusInfo
): string {
  if (option.id === 'tickets') {
    return option.dashboardRoute;
  }

  switch (statusInfo.status) {
    case 'available':
      return option.dashboardRoute;
    case 'pending':
      return option.pendingRoute ?? option.setupRoute;
    case 'unavailable':
      return option.setupRoute;
    default:
      return option.setupRoute;
  }
}
