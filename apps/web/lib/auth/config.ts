/**
 * NextAuth Credentials + Google providers.
 * Login against API POST /auth/login; Google syncs via POST /auth/google.
 */
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions } from 'next-auth';
import type { Role } from '@yo-te-invito/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const TENANT_ID = 'tenant-demo';

async function loginViaApi(email: string, password: string): Promise<{
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  accessToken: string;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantId: 'tenant-demo' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.user;
    const token = data.token;
    if (!user?.id || !token) return null;
    return {
      id: user.id,
      email: user.email,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      role: user.role,
      tenantId: user.tenantId ?? 'tenant-demo',
      accessToken: token,
    };
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return loginViaApi(credentials.email, credentials.password);
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user?.email) {
        try {
          const res = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, name: user.name, image: user.image }),
          });
          if (res.ok) {
            const data = await res.json();
            (user as { id?: string }).id = data.user?.id;
            (user as { role?: Role }).role = data.user?.role;
            (user as { tenantId?: string }).tenantId = data.user?.tenantId ?? TENANT_ID;
            (user as { accessToken?: string }).accessToken = data.token;
          }
        } catch {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = (user as { id?: string }).id ?? user.id ?? token.sub;
        token.role = (user as { role?: Role }).role;
        token.tenantId = (user as { tenantId?: string }).tenantId ?? TENANT_ID;
        token.accessToken = (user as { accessToken?: string }).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as { userId?: string }).userId = token.userId ?? token.sub;
        (session.user as { id?: string }).id = token.userId ?? token.sub;
        (session.user as { role?: string }).role = token.role;
        (session.user as { tenantId?: string }).tenantId = token.tenantId;
        (session.user as { accessToken?: string }).accessToken = token.accessToken;
      }
      return session;
    },
  },
};
