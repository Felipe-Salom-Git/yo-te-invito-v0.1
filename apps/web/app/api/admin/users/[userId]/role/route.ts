/**
 * Admin: update user role (LocalStorage mode).
 */
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { findDynamicUserById, updateDynamicUserRole } from '@/lib/auth/dynamic-users';
import { DEMO_USERS } from '@/lib/auth/demo-users';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const token = await getToken({ req: request });
  const role = token?.role as string | undefined;
  if (!token || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await params;
  const body = await request.json().catch(() => ({}));
  const newRole = (body?.role as string)?.trim();
  if (!newRole) {
    return NextResponse.json({ error: 'Missing role' }, { status: 400 });
  }

  const dynamicUser = findDynamicUserById(userId);
  if (dynamicUser) {
    updateDynamicUserRole(userId, newRole);
    return NextResponse.json({
      id: dynamicUser.id,
      tenantId: dynamicUser.tenantId,
      email: dynamicUser.email,
      role: newRole,
      firstName: dynamicUser.firstName,
      lastName: dynamicUser.lastName,
    });
  }

  const demoUser = DEMO_USERS.find((u) => u.id === userId);
  if (demoUser) {
    updateDynamicUserRole(userId, newRole);
    return NextResponse.json({
      id: demoUser.id,
      tenantId: demoUser.tenantId,
      email: demoUser.email,
      role: newRole,
      firstName: demoUser.firstName,
      lastName: demoUser.lastName,
    });
  }

  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}
