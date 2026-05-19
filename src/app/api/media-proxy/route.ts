import { type NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(req: NextRequest) {
  const headersList = await headers()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  let media
  try {
    media = await payload.findByID({
      collection: 'media',
      id,
      overrideAccess: false,
      user,
    })
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }

  if (!media?.url) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const fileRes = await fetch(String(media.url))
  if (!fileRes.ok) {
    return new NextResponse('Upstream file not available', { status: 502 })
  }

  const contentType = String((media as Record<string, unknown>).mimeType || 'application/octet-stream')
  const filename = String((media as Record<string, unknown>).filename || 'file')

  return new NextResponse(fileRes.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-ancestors 'self'",
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
