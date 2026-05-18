import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { UserRole } from '@/lib/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const payload = await getPayload({ config })
    const me = await payload.auth({ headers: new Headers({ Cookie: `payload-token=${token}` }) })
    if (!me.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const role = me.user.role as UserRole
    const canExport =
      role === UserRole.SYSTEM_ADMIN ||
      role === UserRole.QM_OFFICER ||
      role === UserRole.DEPT_HEAD ||
      role === UserRole.AUDITOR

    if (!canExport) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const confirmations = await payload.find({
      collection: 'read-confirmations',
      depth: 2,
      limit: 10000,
      overrideAccess: true,
    })

    const headers = ['Benutzer', 'E-Mail', 'Dokument', 'Version', 'Bestätigt am', 'IP-Adresse']
    const rows = confirmations.docs.map((conf) => {
      const user = typeof conf.user === 'object' ? conf.user : null
      const doc = typeof conf.document === 'object' ? conf.document : null
      return [
        user ? String(user.name || user.email || '') : String(conf.user),
        user ? String(user.email || '') : '',
        doc ? String((doc as { title?: string }).title || doc.id) : String(conf.document),
        String(conf.documentVersion || ''),
        conf.confirmedAt ? format(new Date(String(conf.confirmedAt)), 'dd.MM.yyyy HH:mm:ss', { locale: de }) : '',
        String(conf.ipAddress || ''),
      ]
    })

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    return new NextResponse('﻿' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="schulungsstand-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
      },
    })
  } catch (err) {
    console.error('Training export error:', err)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
