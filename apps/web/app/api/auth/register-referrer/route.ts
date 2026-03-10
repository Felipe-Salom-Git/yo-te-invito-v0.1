/**
 * Registers a new referrer for auth (in-memory store).
 * Called when the producer creates a referrer user.
 */
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { addDynamicUser, findDynamicUserByEmail } from '@/lib/auth/dynamic-users';
import { findDemoUserByEmail } from '@/lib/auth/demo-users';

const TENANT_ID = 'tenant-demo';

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  const producerRoles = ['PRODUCER_OWNER', 'PRODUCER_STAFF', 'ADMIN'];
  const role = token?.role as string | undefined;
  if (!token || !role || !producerRoles.includes(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const email = (body?.email as string)?.trim();
    const firstName = (body?.firstName as string)?.trim();
    const lastName = (body?.lastName as string)?.trim();
    if (!email || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing email, firstName or lastName' }, { status: 400 });
    }
    const existingDemo = findDemoUserByEmail(email);
    if (existingDemo) {
      return NextResponse.json({ error: 'Email already in use (demo user)' }, { status: 409 });
    }
    if (findDynamicUserByEmail(email)) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    const id = `user-ref-${Date.now()}`;
    addDynamicUser({
      id,
      tenantId: TENANT_ID,
      email: email.toLowerCase(),
      role: 'REFERRER',
      firstName,
      lastName,
    });
    return NextResponse.json({
      id,
      tenantId: TENANT_ID,
      email: email.toLowerCase(),
      firstName,
      lastName,
      role: 'REFERRER',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
