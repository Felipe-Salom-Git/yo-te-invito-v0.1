import type { Role } from '@yo-te-invito/shared';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: Role;
      tenantId?: string;
      userId?: string;
      accessToken?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role;
    tenantId?: string;
    userId?: string;
    accessToken?: string;
  }
}

export type { Role };
