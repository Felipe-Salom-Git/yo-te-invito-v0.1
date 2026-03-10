/**
 * Admin: approve application (LocalStorage mode).
 * Creates user in dynamic-users with PRODUCER_OWNER or GASTRO_OWNER.
 */
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/config';
import {
  getApplication,
  approve as doApprove,
} from '@/lib/auth/role-applications-store';
import { addDynamicUser, findDynamicUserByEmail } from '@/lib/auth/dynamic-users';
import { findDemoUserByEmail } from '@/lib/auth/demo-users';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as string | undefined;
  if (!session?.user || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const app = getApplication(id);
  if (!app || app.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'Application not found or already processed' },
      { status: 404 }
    );
  }

  const demoUser = findDemoUserByEmail(app.email);
  if (demoUser && (demoUser.role === 'PRODUCER_OWNER' || demoUser.role === 'GASTRO_OWNER')) {
    return NextResponse.json(
      { error: 'User already has this role' },
      { status: 409 }
    );
  }

  if (findDynamicUserByEmail(app.email)) {
    return NextResponse.json(
      { error: 'User already exists with this email' },
      { status: 409 }
    );
  }

  doApprove(id);
  const userId = `user-${Date.now()}`;
  addDynamicUser(
    {
      id: userId,
      tenantId: app.tenantId,
      email: app.email,
      role: app.role,
      firstName: app.firstName,
      lastName: app.lastName,
    },
    'demo' // In local mode we can't store the real password; user must use demo or we'd need to extend
  );
  // Note: In local mode we use 'demo' as password - the applicant won't know it.
  // For a real flow we'd need to store the password when approving.
  // For demo purposes this is acceptable.

  return NextResponse.json({
    id: userId,
    email: app.email,
    role: app.role,
    message: 'Application approved. User can log in with email / demo.',
  });
}
