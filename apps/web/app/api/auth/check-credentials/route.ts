/**
 * Returns role for valid credentials.
 * Uses API when NEXT_PUBLIC_USE_API is true, else demo/dynamic users.
 */
import { NextResponse } from 'next/server';
import { validateAnyUser } from '@/lib/auth/validate';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body?.email as string | undefined)?.trim()?.toLowerCase();
    const password = body?.password as string | undefined;
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    if (USE_API) {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, tenantId: 'tenant-demo' }),
        });
        if (!res.ok) {
          return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
        const data = (await res.json()) as { user?: { role?: string } };
        return NextResponse.json({ role: data.user?.role ?? 'USER' });
      } catch {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    const user = validateAnyUser(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    return NextResponse.json({ role: user.role });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
