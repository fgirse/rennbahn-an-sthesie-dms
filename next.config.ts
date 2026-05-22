import type { NextConfig } from 'next'
import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // X-Frame-Options is NOT set here — it's set per-route:
  //   • Frontend pages → middleware adds X-Frame-Options: DENY + CSP frame-ancestors 'none'
  //   • Media proxy    → route handler adds X-Frame-Options: SAMEORIGIN + frame-ancestors 'self'
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.resend.com",
      // PDF.js web worker: webpack emits it as /_next/static/chunks/<hash>.mjs (self),
      // but blob: is also listed as a fallback in case the runtime resolves it differently.
      "worker-src blob: 'self'",
      // frame-ancestors is intentionally omitted here — set per-route (see above)
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.1.183'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any) => {
    // PDF.js tries to require 'canvas' for server-side rendering; alias it away
    // so webpack does not try to bundle native bindings that are unavailable.
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string>),
      canvas: false,
    }
    return config
  },
  headers: async () => [
    // Apply base security headers to all routes.
    // Framing directives (X-Frame-Options / frame-ancestors) are handled separately:
    //   - frontend pages: middleware.ts
    //   - media proxy API: route handler (src/app/api/media-proxy/route.ts)
    { source: '/(.*)', headers: securityHeaders },
  ],
}

export default withNextIntl(withPayload(nextConfig))
