import createIntlMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

// Allowed frame-ancestors for the CSP header.
// Set the FRAME_ANCESTORS environment variable in Vercel to control embedding:
//   'none'                             → no embedding allowed (most secure, default if not set)
//   'self'                             → same-origin embedding only
//   'self' https://ehr.example.com     → same-origin + specific external tool
// The value is placed directly in the CSP header, e.g.:
//   Content-Security-Policy: frame-ancestors 'self' https://ehr.example.com
const frameAncestors: string = process.env.FRAME_ANCESTORS ?? "'self'"

export function middleware(request: NextRequest): NextResponse {
  // Run next-intl locale routing for frontend paths
  const response = intlMiddleware(request)

  // Clickjacking protection: restrict which origins may embed these pages in iframes.
  // These headers are set here (not in next.config.ts) so that they apply ONLY to
  // frontend routes — never to /api/media-proxy, which deliberately needs
  // X-Frame-Options: SAMEORIGIN + frame-ancestors 'self' for the DocumentViewer iframe.
  //
  // X-Frame-Options is a fallback for browsers that predate CSP frame-ancestors.
  // Modern browsers honour frame-ancestors and ignore X-Frame-Options when both are present.
  const xfo = frameAncestors === "'none'" ? 'DENY' : 'SAMEORIGIN'
  response.headers.set('X-Frame-Options', xfo)
  response.headers.set('Content-Security-Policy', `frame-ancestors ${frameAncestors}`)

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
