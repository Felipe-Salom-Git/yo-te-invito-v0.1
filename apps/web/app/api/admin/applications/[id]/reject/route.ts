/**
 * Admin: reject application (LocalStorage mode).
 */
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/config';
import { getApplication, reject as doReject } from '@/lib/auth/role-applications-store';

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

  doReject(id);
  return NextResponse.json({ message: 'Application rejected' });
}
