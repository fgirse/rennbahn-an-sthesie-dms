import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { verifyTOTP, verifyBackupCode } from '@/lib/auth/mfa'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    // Read pending MFA user ID set during login
    const pendingUserId = cookieStore.get('mfa-pending-user')?.value
    if (!pendingUserId) {
      return NextResponse.json({ message: 'Keine ausstehende MFA-Verifizierung.' }, { status: 400 })
    }

    const { code, useBackupCode } = await req.json()
    if (!code) {
      return NextResponse.json({ message: 'Code erforderlich.' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    const user = await payload.findByID({
      collection: 'users',
      id: pendingUserId,
      overrideAccess: true,
    })

    if (!user || !user.mfaEnabled) {
      return NextResponse.json({ message: 'MFA nicht aktiviert.' }, { status: 400 })
    }

    let valid = false

    if (useBackupCode) {
      const result = verifyBackupCode(code, (user.mfaBackupCodes as string[]) || [])
      if (result.valid) {
        valid = true
        // Remove used backup code
        await payload.update({
          collection: 'users',
          id: pendingUserId,
          data: { mfaBackupCodes: result.remainingCodes },
          overrideAccess: true,
        })
      }
    } else {
      valid = verifyTOTP(String(user.mfaSecret || ''), code)
    }

    if (!valid) {
      return NextResponse.json({ message: 'Ungültiger Code.' }, { status: 401 })
    }

    // Retrieve the token that was stored during the login step
    const pendingToken = cookieStore.get('mfa-pending-token')?.value
    if (!pendingToken) {
      return NextResponse.json({ message: 'Sitzung abgelaufen. Bitte erneut anmelden.' }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })

    // Issue session cookie
    response.cookies.set('payload-token', pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 900,
      path: '/',
    })

    // Clear pending token
    response.cookies.delete('mfa-pending-token')

    // Clear pending MFA cookie
    response.cookies.delete('mfa-pending-user')

    // Update last login
    await payload.update({
      collection: 'users',
      id: pendingUserId,
      data: { lastLogin: new Date().toISOString() },
      overrideAccess: true,
    })

    return response
  } catch (err) {
    console.error('MFA verify error:', err)
    return NextResponse.json({ message: 'Interner Serverfehler.' }, { status: 500 })
  }
}
