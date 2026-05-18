import { NextResponse } from 'next/server'
import { generateSamlLoginUrl } from '@/lib/auth/saml-strategy'

export async function GET() {
  if (!process.env.SAML_IDP_SSO_URL) {
    return NextResponse.json(
      { error: 'SSO not configured. Use email/password login.' },
      { status: 400 }
    )
  }

  try {
    const loginUrl = await generateSamlLoginUrl()
    return NextResponse.redirect(loginUrl)
  } catch {
    return NextResponse.json({ error: 'Failed to initiate SSO login' }, { status: 500 })
  }
}
