/**
 * Registers a new user (LocalStorage / demo mode).
 * Adds to dynamic-users so they can log in with Credentials.
 */
import { NextResponse } from 'next/server';
import { addDynamicUser, findDynamicUserByEmail } from '@/lib/auth/dynamic-users';
import { findDemoUserByEmail } from '@/lib/auth/demo-users';

const TENANT_ID = 'tenant-demo';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body?.email as string)?.trim()?.toLowerCase();
    const password = (body?.password as string);
    const firstName = (body?.firstName as string)?.trim();
    const lastName = (body?.lastName as string)?.trim();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Faltan email, contraseña, nombre o apellido' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    if (findDemoUserByEmail(email)) {
      return NextResponse.json(
        { error: 'Ese email ya está en uso' },
        { status: 409 }
      );
    }
    if (findDynamicUserByEmail(email)) {
      return NextResponse.json(
        { error: 'Ese email ya está registrado' },
        { status: 409 }
      );
    }

    const id = `user-${Date.now()}`;
    addDynamicUser(
      {
        id,
        tenantId: TENANT_ID,
        email,
        role: 'USER',
        firstName,
        lastName,
      },
      password
    );

    return NextResponse.json({
      id,
      tenantId: TENANT_ID,
      email,
      firstName,
      lastName,
      role: 'USER',
    });
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
}
