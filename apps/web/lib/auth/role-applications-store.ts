/**
 * In-memory store for role applications (LocalStorage mode).
 * Used by /api/auth/apply-role and /api/admin/applications.
 */

const TENANT_ID = 'tenant-demo';

export interface StoredApplication {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  businessName?: string;
  role: 'PRODUCER_OWNER' | 'GASTRO_OWNER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
}

const applications = new Map<string, StoredApplication>();

export function addApplication(app: Omit<StoredApplication, 'id' | 'tenantId' | 'status' | 'createdAt'>): StoredApplication {
  const id = `app-${Date.now()}`;
  const stored: StoredApplication = {
    ...app,
    id,
    tenantId: TENANT_ID,
    status: 'PENDING',
    createdAt: new Date(),
  };
  applications.set(id, stored);
  return stored;
}

export function getApplication(id: string): StoredApplication | undefined {
  return applications.get(id);
}

export function listPending(tenantId: string): StoredApplication[] {
  return Array.from(applications.values()).filter(
    (a) => a.tenantId === tenantId && a.status === 'PENDING'
  );
}

export function approve(id: string): StoredApplication | undefined {
  const app = applications.get(id);
  if (!app || app.status !== 'PENDING') return undefined;
  app.status = 'APPROVED';
  return app;
}

export function reject(id: string): StoredApplication | undefined {
  const app = applications.get(id);
  if (!app || app.status !== 'PENDING') return undefined;
  app.status = 'REJECTED';
  return app;
}
