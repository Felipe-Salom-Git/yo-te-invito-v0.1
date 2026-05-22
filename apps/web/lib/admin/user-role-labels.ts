import { Role } from '@yo-te-invito/shared';

/** Spanish labels for user roles (admin UI). */
export const USER_ROLE_LABELS: Record<string, string> = {
  [Role.ADMIN]: 'Administrador',
  [Role.PRODUCER_OWNER]: 'Dueño de productora',
  [Role.PRODUCER_STAFF]: 'Staff de productora',
  [Role.GASTRO_OWNER]: 'Dueño gastronómico',
  [Role.HOTEL_OWNER]: 'Dueño de hotel',
  [Role.REFERRER]: 'Referidor',
  [Role.USER]: 'Usuario',
  [Role.SCANNER]: 'Scanner',
};

export const USER_ROLE_OPTIONS = (Object.values(Role) as string[]).map((value) => ({
  value,
  label: USER_ROLE_LABELS[value] ?? value,
}));

export function getUserRoleLabel(role: string): string {
  return USER_ROLE_LABELS[role] ?? role;
}
