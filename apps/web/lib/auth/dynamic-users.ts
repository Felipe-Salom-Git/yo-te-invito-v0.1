/**
 * Server-side store for dynamically created referrers.
 * Used by Credentials provider and API route.
 * In-memory only (resets on server restart).
 */
import type { DemoUser } from './demo-users';

const DEMO_PASSWORD = 'demo';
const TENANT_ID = 'tenant-demo';

const dynamicUsers = new Map<string, DemoUser>();
/** Role overrides for demo users (id -> role). */
const demoRoleOverrides = new Map<string, string>();

export function addDynamicUser(
  user: Omit<DemoUser, 'password'>,
  password?: string,
): void {
  dynamicUsers.set(user.email.toLowerCase(), {
    ...user,
    password: password ?? DEMO_PASSWORD,
  });
}

export function findDynamicUserByEmail(email: string): DemoUser | undefined {
  return dynamicUsers.get(email.toLowerCase());
}

export function findDynamicUserById(id: string): DemoUser | undefined {
  return Array.from(dynamicUsers.values()).find((u) => u.id === id);
}

export function updateDynamicUserRole(id: string, role: string): boolean {
  const user = findDynamicUserById(id);
  if (user) {
    dynamicUsers.set(user.email.toLowerCase(), { ...user, role: role as DemoUser['role'] });
    return true;
  }
  demoRoleOverrides.set(id, role);
  return true;
}

export function getDemoRoleOverride(id: string): string | undefined {
  return demoRoleOverrides.get(id);
}

export function getAllDynamicUserIds(): string[] {
  return Array.from(dynamicUsers.values()).map((u) => u.id);
}

/** Returns all dynamic users as User objects (no password). */
export function listAllDynamicUsers(): Array<{ id: string; tenantId: string; email: string; role: string; firstName: string; lastName: string }> {
  return Array.from(dynamicUsers.values()).map(({ id, tenantId, email, role, firstName, lastName }) => ({
    id,
    tenantId,
    email,
    role,
    firstName,
    lastName,
  }));
}
