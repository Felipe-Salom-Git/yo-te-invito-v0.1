/**
 * NextAuth skeleton — placeholder for V1 bootstrap
 * Esqueleto de NextAuth — placeholder para bootstrap V1
 * TODO: Add providers (credentials, OAuth) and session handling
 */
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' },
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as { id?: string }).id = token.sub ?? undefined;
      }
      return session;
    },
  },
};
