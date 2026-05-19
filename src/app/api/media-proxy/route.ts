import { type NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import fs from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest) {
  try {
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

    let media: Record<string, unknown>
    try {
      media = (await payload.findByID({
        collection: 'media',
        id,
        overrideAccess: false,
        user,
      })) as Record<string, unknown>
    } catch (err) {
      console.error('[media-proxy] findByID failed for id:', id, err)
      return new NextResponse('Not Found', { status: 404 })
    }

    if (!media?.url) {
      console.error('[media-proxy] media.url missing for id:', id)
      return new NextResponse('Not Found', { status: 404 })
    }

    const contentType = String(media.mimeType || 'application/octet-stream')
    const filename = String(media.filename || 'file')

    const responseHeaders = {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-ancestors 'self'",
      'Cache-Control': 'private, max-age=3600',
    }

    // Resolve absolute URL (Vercel Blob = https://..., local = relative or http://localhost/...)
    let fileUrl = String(media.url)
    if (!fileUrl.startsWith('http')) {
      const base = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')
      fileUrl = `${base}${fileUrl}`
    }

    const parsedUrl = new URL(fileUrl)
    const isLocal = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1'

    if (isLocal) {
      // Local disk storage — read file directly to avoid circular HTTP request.
      // Try several candidate paths because Payload v3 staticDir varies by config.
      const mediaFilename = String(media.filename || '')
      const candidates = [
        path.join(process.cwd(), 'public', parsedUrl.pathname),          // public/media/file.pdf
        path.join(process.cwd(), parsedUrl.pathname.replace(/^\//, '')), // media/file.pdf
        path.join(process.cwd(), 'public', 'media', mediaFilename),      // public/media/<filename>
        path.join(process.cwd(), 'media', mediaFilename),                // media/<filename>
      ]

      let fileBuffer: Buffer | null = null
      for (const candidate of candidates) {
        try {
          fileBuffer = await fs.readFile(candidate)
          break
        } catch {
          // try next candidate
        }
      }

      if (!fileBuffer) {
        console.error('[media-proxy] file not found on disk. Tried:', candidates)
        return new NextResponse('File not found on disk', { status: 404 })
      }

      return new NextResponse(new Uint8Array(fileBuffer), { headers: responseHeaders })
    }

    // External storage (Vercel Blob) — fetch via HTTP
    let fileRes: Response
    try {
      fileRes = await fetch(fileUrl)
    } catch (err) {
      console.error('[media-proxy] fetch failed:', fileUrl, err)
      return new NextResponse('Could not retrieve file', { status: 502 })
    }

    if (!fileRes.ok) {
      console.error('[media-proxy] upstream status', fileRes.status, 'for', fileUrl)
      return new NextResponse('Upstream file not available', { status: 502 })
    }

    return new NextResponse(fileRes.body, { headers: responseHeaders })
  } catch (err) {
    console.error('[media-proxy] unhandled error:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
