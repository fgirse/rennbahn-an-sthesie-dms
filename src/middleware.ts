import createIntlMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export function middleware(request: NextRequest): NextResponse {
  // Run next-intl locale routing for frontend paths
  const response = intlMiddleware(request)

  // Prevent clickjacking: disallow embedding this page in any iframe.
  // These headers are set here (not in next.config.ts) so that they are
  // applied ONLY to frontend routes — never to /api/media-proxy, which
  // deliberately needs X-Frame-Options: SAMEORIGIN + frame-ancestors 'self'
  // so the DocumentViewer iframe can load it.
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Content-Security-Policy', "frame-ancestors 'none'")

  return response
}

export const config = {
  // Match all frontend + admin routes.
  // Explicitly excludes:
  //   /api/*          — handled by route handlers (media-proxy sets its own framing headers)
  //   /media/*        — static media files (served by Payload / Vercel Blob)
  //   /_next/*        — Next.js internals
  //   /favicon.ico    — static asset
  matcher: [
    '/((?!api|media|_next/static|_next/image|favicon\\.ico).*)',
  ],
}
