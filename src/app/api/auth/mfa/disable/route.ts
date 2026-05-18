import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { verifyTOTP, verifyBackupCode } from '@/lib/auth/mfa'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ message: 'Nicht authentifiziert.' }, { status: 401 })
    }

    const { code } = await req.json()
    if (!code) {
      return NextResponse.json({ message: 'Code erforderlich.' }, { status: 400 })
    }

    const mfaSecret = String(user.mfaSecret || '')
    const backupCodes = (user.mfaBackupCodes as string[]) || []

    const totpValid = mfaSecret ? verifyTOTP(mfaSecret, code) : false
    const backupResult = !totpValid ? verifyBackupCode(code, backupCodes) : { valid: false, remainingCodes: backupCodes }

    if (!totpValid && !backupResult.valid) {
      return NextResponse.json({ message: 'Ungültiger Code.' }, { status: 401 })
    }

    await payload.update({
      collection: 'users',
      id: String(user.id),
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      },
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('MFA disable error:', err)
    return NextResponse.json({ message: 'Interner Serverfehler.' }, { status: 500 })
  }
}
