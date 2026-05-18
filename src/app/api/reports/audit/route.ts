import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { UserRole } from '@/lib/types'
import type { Where } from 'payload'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export async function GET(req: NextRequest) {
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
      role === UserRole.AUDITOR

    if (!canExport) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const reqUrl = new URL(req.url)
    const from = reqUrl.searchParams.get('from')
    const to = reqUrl.searchParams.get('to')

    const dateFilter: Where[] = []
    if (from) dateFilter.push({ timestamp: { greater_than_equal: new Date(from).toISOString() } })
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      dateFilter.push({ timestamp: { less_than_equal: toDate.toISOString() } })
    }

    const logs = await payload.find({
      collection: 'audit-logs',
      where: dateFilter.length > 0 ? { and: dateFilter } : {},
      sort: '-timestamp',
      limit: 10000,
      overrideAccess: true,
    })

    const headers = ['Zeitstempel', 'Benutzer', 'Rolle', 'Aktion', 'Dokument', 'Version', 'IP-Adresse']
    const rows = logs.docs.map((log) => [
      log.timestamp ? format(new Date(String(log.timestamp)), 'dd.MM.yyyy HH:mm:ss', { locale: de }) : '',
      String(log.userName || ''),
      String(log.userRole || ''),
      String(log.action || ''),
      String(log.documentTitle || log.documentId || ''),
      String(log.documentVersion || ''),
      String(log.ipAddress || ''),
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    return new NextResponse('﻿' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-trail-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
      },
    })
  } catch (err) {
    console.error('Audit export error:', err)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
