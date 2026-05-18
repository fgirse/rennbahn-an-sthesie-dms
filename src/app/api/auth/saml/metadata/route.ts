import { NextResponse } from 'next/server'
import { getSamlMetadataXml } from '@/lib/auth/saml-strategy'

export async function GET() {
  const xml = getSamlMetadataXml()
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
