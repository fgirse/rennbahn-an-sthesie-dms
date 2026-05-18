import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value
    if (!token) {
      return NextResponse.json({ message: 'Nicht authentifiziert.' }, { status: 401 })
    }

    const payload = await getPayload({ config })
    const me = await payload.auth({ headers: new Headers({ Cookie: `payload-token=${token}` }) })
    if (!me.user) {
      return NextResponse.json({ message: 'Nicht authentifiziert.' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Aktuelles und neues Passwort erforderlich.' }, { status: 400 })
    }

    if (newPassword.length < 12) {
      return NextResponse.json({ message: 'Das neue Passwort muss mindestens 12 Zeichen lang sein.' }, { status: 400 })
    }

    // Verify current password by attempting login
    try {
      await payload.login({
        collection: 'users',
        data: { email: String(me.user.email), password: currentPassword },
      })
    } catch {
      return NextResponse.json({ message: 'Das aktuelle Passwort ist falsch.' }, { status: 401 })
    }

    // Update password
    await payload.update({
      collection: 'users',
      id: String(me.user.id),
      data: { password: newPassword },
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Change password error:', err)
    return NextResponse.json({ message: 'Interner Serverfehler.' }, { status: 500 })
  }
}
