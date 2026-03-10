/**
 * Admin: list pending applications (LocalStorage mode).
 */
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/config';
import { listPending } from '@/lib/auth/role-applications-store';

const TENANT_ID = 'tenant-demo';

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as string | undefined;
  if (!session?.user || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apps = listPending(TENANT_ID);
  return NextResponse.json(
    apps.map((a) => ({
      id: a.id,
      email: a.email,
      firstName: a.firstName,
      lastName: a.lastName,
      phone: a.phone,
      businessName: a.businessName,
      role: a.role,
      createdAt: a.createdAt,
    }))
  );
}
