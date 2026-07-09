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
  // Required behind the TLS-terminating upstream proxy: trust
  // X-Forwarded-Host / X-Forwarded-Proto from host nginx.
  trustHost: true,
  // Auth.js action parsing reads the pathname off `NextRequest.nextUrl`, which
  // Next.js *always* normalizes to be basePath-relative (unprefixed) before
  // an API route handler ever sees it — even though the raw incoming request
  // (and page routing) requires the `/gogoffcc-pmm` prefix (verified via
  // Task 10 diagnostics: the UnknownAction error logged the *unprefixed*
  // pathname, e.g. "/api/auth/providers", not the prefixed one). This must
  // therefore stay the literal, unprefixed default ('/api/auth'), NOT
  // `${NEXT_PUBLIC_BASE_PATH}/api/auth`. It still has to be set explicitly
  // because next-auth's own `setEnvDefaults()` otherwise derives basePath
  // from `AUTH_URL`'s pathname — which sub-path deployments correctly set to
  // the prefixed public URL (`.../gogoffcc-pmm/api/auth`) — and that
  // prefixed value would mismatch the unprefixed pathname Next.js hands to
  // the handler, reproducing the same UnknownAction failure.
  basePath: '/api/auth',
}
