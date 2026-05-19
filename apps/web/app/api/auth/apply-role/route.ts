/**
 * Apply for PRODUCER_OWNER, GASTRO_OWNER or HOTEL_OWNER role (in-memory demo mode).
 */
import * as crypto from 'crypto';
import { NextResponse } from 'next/server';
import { addApplication, listPending } from '@/lib/auth/role-applications-store';
import { findDemoUserByEmail } from '@/lib/auth/demo-users';

const TENANT_ID = 'tenant-demo';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body?.email as string)?.trim()?.toLowerCase();
    const password = (body?.password as string);
    const firstName = (body?.firstName as string)?.trim();
    const lastName = (body?.lastName as string)?.trim();
    const role = body?.role as 'PRODUCER_OWNER' | 'GASTRO_OWNER' | 'HOTEL_OWNER';
    const phone = (body?.phone as string)?.trim();
    const businessName = (body?.businessName as string)?.trim();

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }
    if (role !== 'PRODUCER_OWNER' && role !== 'GASTRO_OWNER' && role !== 'HOTEL_OWNER') {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const pending = listPending(TENANT_ID).some((a) => a.email === email);
    if (pending) {
      return NextResponse.json(
        { error: 'Ya hay una solicitud pendiente para este email' },
        { status: 409 }
      );
    }

    const demoUser = findDemoUserByEmail(email);
    if (
      demoUser &&
      (demoUser.role === 'PRODUCER_OWNER' ||
        demoUser.role === 'GASTRO_OWNER' ||
        demoUser.role === 'HOTEL_OWNER')
    ) {
      return NextResponse.json(
        { error: 'Este email ya tiene rol de productor, gastro u hotel' },
        { status: 409 }
      );
    }

    const app = addApplication({
      email,
      passwordHash: hashPassword(password),
      firstName,
      lastName,
      phone: phone || undefined,
      businessName: businessName || undefined,
      role,
    });

    return NextResponse.json({
      id: app.id,
      message: 'Tu solicitud fue enviada. Te avisaremos cuando sea aprobada.',
    });
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
}
