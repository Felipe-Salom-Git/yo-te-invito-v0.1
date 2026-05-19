/**
 * Demo users for Credentials provider — mirrors LocalDB seed.
 * Password: "demo" for all users.
 */
import type { Role } from '@yo-te-invito/shared';

const DEMO_PASSWORD = 'demo';
const TENANT_ID = 'tenant-demo';

export interface DemoUser {
  id: string;
  tenantId: string;
  email: string;
  password: string;
  role: Role;
  firstName: string;
  lastName: string;
}

export const DEMO_USERS: DemoUser[] = [
  { id: 'user-admin', tenantId: TENANT_ID, email: 'admin@demo.local', password: DEMO_PASSWORD, role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
  { id: 'user-producer', tenantId: TENANT_ID, email: 'producer@demo.local', password: DEMO_PASSWORD, role: 'PRODUCER_OWNER', firstName: 'Producer', lastName: 'User' },
  { id: 'user-gastro', tenantId: TENANT_ID, email: 'gastro@demo.local', password: DEMO_PASSWORD, role: 'GASTRO_OWNER', firstName: 'Gastro', lastName: 'User' },
  { id: 'user-hotel', tenantId: TENANT_ID, email: 'hotel@demo.local', password: DEMO_PASSWORD, role: 'HOTEL_OWNER', firstName: 'Hotel', lastName: 'User' },
  { id: 'user-referrer', tenantId: TENANT_ID, email: 'referrer@demo.local', password: DEMO_PASSWORD, role: 'REFERRER', firstName: 'Referrer', lastName: 'User' },
  { id: 'user-buyer', tenantId: TENANT_ID, email: 'user@demo.local', password: DEMO_PASSWORD, role: 'USER', firstName: 'Buyer', lastName: 'User' },
  { id: 'user-scanner', tenantId: TENANT_ID, email: 'scanner@demo.local', password: DEMO_PASSWORD, role: 'SCANNER', firstName: 'Scanner', lastName: 'Operator' },
];

export function findDemoUserByEmail(email: string): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function validateDemoUser(email: string, password: string): DemoUser | null {
  const user = findDemoUserByEmail(email);
  if (!user || user.password !== password) return null;
  return user;
}
