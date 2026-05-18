import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { verifyTOTP, generateBackupCodes } from '@/lib/auth/mfa'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ message: 'Nicht authentifiziert.' }, { status: 401 })
    }

    const { code } = await req.json()
    if (!code || String(code).length !== 6) {
      return NextResponse.json({ message: 'Ungültiger Code.' }, { status: 400 })
    }

    const mfaSecret = String(user.mfaSecret || '')
    if (!mfaSecret) {
      return NextResponse.json({ message: 'Kein MFA-Secret vorhanden. Bitte starten Sie die Einrichtung erneut.' }, { status: 400 })
    }

    const valid = verifyTOTP(mfaSecret, code)
    if (!valid) {
      return NextResponse.json({ message: 'Ungültiger Code. Bitte erneut versuchen.' }, { status: 401 })
    }

    const { plain: backupCodes, hashed: hashedBackupCodes } = generateBackupCodes()

    await payload.update({
      collection: 'users',
      id: String(user.id),
      data: {
        mfaEnabled: true,
        mfaBackupCodes: hashedBackupCodes,
      },
      overrideAccess: true,
    })

    return NextResponse.json({ success: true, backupCodes })
  } catch (err) {
    console.error('MFA enable error:', err)
    return NextResponse.json({ message: 'Interner Serverfehler.' }, { status: 500 })
  }
}
