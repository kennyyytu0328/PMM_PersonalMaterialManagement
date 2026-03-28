import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Redirect unauthenticated users to login
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') && (session.user as any)?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/items/:path*',
    '/scan/:path*',
    '/activity/:path*',
    '/reports/:path*',
    '/admin/:path*',
    '/api/((?!auth).*)',
  ],
}
