import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateTOTPSecret } from '@/lib/auth/mfa'
import * as OTPAuth from 'otpauth'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ message: 'Nicht authentifiziert.' }, { status: 401 })
    }

    const secret = generateTOTPSecret()

    const totp = new OTPAuth.TOTP({
      issuer: process.env.MFA_ISSUER || 'DMS Rennbahnklinik',
      label: String(user.email),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    })

    const otpAuthUrl = totp.toString()

    // Generate QR code as data URL
    let qrCodeDataUrl = ''
    try {
      const QRCode = await import('qrcode')
      qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl)
    } catch {
      // QR code generation is optional; client can use the otpAuthUrl directly
    }

    // Store secret temporarily (not enabled until verified)
    await payload.update({
      collection: 'users',
      id: String(user.id),
      data: { mfaSecret: secret },
      overrideAccess: true,
    })

    return NextResponse.json({ secret, otpAuthUrl, qrCodeDataUrl })
  } catch (err) {
    console.error('MFA setup error:', err)
    return NextResponse.json({ message: 'Interner Serverfehler.' }, { status: 500 })
  }
}
