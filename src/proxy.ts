import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'


const handleI18nRouting = createMiddleware(routing)

// Allowed frame-ancestors for the CSP header.
// Set the FRAME_ANCESTORS environment variable in Vercel to control embedding:
//   'none'                             → no embedding allowed (most secure)
//   'self'                             → same-origin embedding only (default)
//   'self' https://ehr.example.com     → same-origin + specific external tool
const frameAncestors: string = process.env.FRAME_ANCESTORS ?? "'self'"

const PUBLIC_LOCALIZED_PATHS = ['/login']
const PUBLIC_PATH_PREFIXES = ['/api/', '/_next/', '/favicon', '/logo']

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl

  // Pass through API routes and static files
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Payload admin: redirect /admin/<locale>[/rest] → /admin[/rest]?locale=<locale>
  // Payload uses query params for locale, not path segments.
  if (pathname.startsWith('/admin/')) {
    const afterAdmin = pathname.slice(7) // e.g. 'de' or 'de/collections/documents'
    const firstSegment = afterAdmin.split('/')[0]
    if (routing.locales.includes(firstSegment as (typeof routing.locales)[number])) {
      const rest = afterAdmin.slice(firstSegment.length) // e.g. '' or '/collections/documents'
      const newUrl = new URL(`/admin${rest}`, req.url)
      req.nextUrl.searchParams.forEach((value, key) => newUrl.searchParams.set(key, value))
      newUrl.searchParams.set('locale', firstSegment)
      return NextResponse.redirect(newUrl)
    }
  }

  // Pass through remaining Payload admin routes
  if (pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Detect locale from path (e.g. /de/dokumente → de)
  const pathnameLocale = routing.locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
  const locale = pathnameLocale || routing.defaultLocale
  const pathWithoutLocale = pathnameLocale
    ? pathname.slice(`/${locale}`.length) || '/'
    : pathname

  // Allow login page and SAML callback without auth
  const isPublic = PUBLIC_LOCALIZED_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + '/')
  )

  if (!isPublic) {
    const token = req.cookies.get('payload-token')?.value
    if (!token) {
      const loginUrl = new URL(`/${locale}/login`, req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check external auditor token expiry stored in a separate cookie
    const auditorExpiry = req.cookies.get('auditor-expiry')?.value
    if (auditorExpiry && new Date(auditorExpiry) < new Date()) {
      const res = NextResponse.redirect(new URL(`/${locale}/login?error=access_expired`, req.url))
      res.cookies.delete('payload-token')
      return res
    }
  }

  // Let next-intl handle locale routing, then add clickjacking-protection headers
  const response = handleI18nRouting(req) as NextResponse
  const xfo = frameAncestors === "'none'" ? 'DENY' : 'SAMEORIGIN'
  response.headers.set('X-Frame-Options', xfo)
  response.headers.set('Content-Security-Policy', `frame-ancestors ${frameAncestors}`)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.svg).*)'],
}
