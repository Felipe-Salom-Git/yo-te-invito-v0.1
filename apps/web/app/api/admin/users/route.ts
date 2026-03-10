/**
 * Admin: list users (LocalStorage mode).
 * Returns demo users + dynamic users (referrers created via register-referrer).
 */
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { DEMO_USERS } from '@/lib/auth/demo-users';
import { listAllDynamicUsers, getDemoRoleOverride } from '@/lib/auth/dynamic-users';

function toUser(u: { id: string; tenantId: string; email: string; role: string; firstName: string; lastName: string }) {
  return { id: u.id, tenantId: u.tenantId, email: u.email, role: u.role, firstName: u.firstName, lastName: u.lastName };
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  const role = token?.role as string | undefined;
  if (!token || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const demoUsers = DEMO_USERS.map((u) => {
    const override = getDemoRoleOverride(u.id);
    return toUser({ ...u, role: override ?? u.role });
  });
  const dynamicUsers = listAllDynamicUsers();
  const seenIds = new Set<string>();
  const merged: typeof demoUsers = [];
  for (const u of [...demoUsers, ...dynamicUsers]) {
    if (!seenIds.has(u.id)) {
      seenIds.add(u.id);
      merged.push(u);
    }
  }
  return NextResponse.json({ users: merged });
}
