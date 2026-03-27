import type { NextAuthConfig } from 'next-auth'

// Edge-compatible auth config (no Node.js-only imports)
export const authConfig: NextAuthConfig = {
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id as string
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role
        ;(session.user as any).id = token.id
      }
      return session
    },
    authorized({ auth }) {
      return !!auth?.user
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
}
