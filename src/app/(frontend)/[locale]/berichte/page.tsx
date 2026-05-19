import { getTranslations } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { UserRole } from '@/lib/types'
import type { Where } from 'payload'
import { extractId } from '@/lib/extractId'
import { Download, FileText, Users, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tab?: string; from?: string; to?: string; page?: string }>
}

const ACTION_LABELS: Record<string, string> = {
  erstellt: 'Erstellt',
  gelesen: 'Gelesen',
  geaendert: 'Geändert',
  freigegeben: 'Freigegeben',
  abgelehnt: 'Abgelehnt',
  archiviert: 'Archiviert',
  lesebestaetigt: 'Lesebestätigt',
  geloescht: 'Gelöscht',
  exportiert: 'Exportiert',
  angemeldet: 'Angemeldet',
  abgemeldet: 'Abgemeldet',
  zur_pruefung_eingereicht: 'Zur Prüfung eingereicht',
  revision_gestartet: 'Revision gestartet',
}

export default async function ReportsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { tab = 'audit', from, to, page: pageParam } = await searchParams
  const t = await getTranslations('reports')

  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) redirect(`/${locale}/login`)

  const payload = await getPayload({ config })
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })
  if (!user) redirect(`/${locale}/login`)

  const userRole = (user as { role?: string }).role as UserRole
  const u = user as Record<string, unknown>
  const userName = (u.name as string) || `${u.firstName || ''} ${u.lastName || ''}`.trim()

  const canViewReports =
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.QM_OFFICER ||
    userRole === UserRole.DEPT_HEAD ||
    userRole === UserRole.AUDITOR

  if (!canViewReports) redirect(`/${locale}`)

  const page = parseInt(pageParam || '1')

  const dateFilter: Where[] = []
  if (from) dateFilter.push({ timestamp: { greater_than_equal: new Date(from).toISOString() } })
  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    dateFilter.push({ timestamp: { less_than_equal: toDate.toISOString() } })
  }

  // Fetch audit logs
  const auditLogs = tab === 'audit' ? await payload.find({
    collection: 'audit-logs',
    where: dateFilter.length > 0 ? { and: dateFilter } : {},
    sort: '-timestamp',
    page,
    limit: 25,
  }) : null

  // Fetch training/read confirmation status
  const readConfirmations = tab === 'training' ? await payload.find({
    collection: 'read-confirmations',
    depth: 2,
    sort: '-confirmedAt',
    limit: 500,
  }) : null

  // Fetch expiring documents
  const expiringDocs = tab === 'expiring' ? await payload.find({
    collection: 'documents',
    where: {
      and: [
        { status: { equals: 'freigegeben' } },
        { validUntil: { less_than_equal: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() } },
        { validUntil: { greater_than: new Date().toISOString() } },
      ],
    },
    sort: 'validUntil',
    depth: 1,
    limit: 100,
    locale: locale as 'de' | 'en' | 'fr' | 'it',
    overrideAccess: false,
    user,
  }) : null

  const tabs = [
    { id: 'audit', label: t('auditTrail'), icon: FileText },
    { id: 'training', label: t('trainingStatus'), icon: Users },
    { id: 'expiring', label: t('expiringDocuments'), icon: Clock },
  ]

  return (
    <AppShell locale={locale} userRole={userRole} userName={userName} pageTitle={t('title')}>
      <div className="space-y-5">
        {/* Tab bar */}
        <div className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              href={`?tab=${id}`}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-white text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>

        {/* Date filter */}
        {(tab === 'audit') && (
          <form method="GET" className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <input type="hidden" name="tab" value={tab} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">{t('from')}</label>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="rounded-lg border border-[var(--color-input)] px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">{t('to')}</label>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="rounded-lg border border-[var(--color-input)] px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
              />
            </div>
            <button type="submit" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              {t('generateReport')}
            </button>
            <a
              href={`/api/reports/audit?from=${from || ''}&to=${to || ''}&format=csv`}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-muted)]"
            >
              <Download className="h-4 w-4" />
              {t('exportCsv')}
            </a>
          </form>
        )}

        {/* Audit trail tab */}
        {tab === 'audit' && auditLogs && (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">{t('columns.timestamp')}</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">{t('columns.user')}</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)] sm:table-cell">{t('columns.role')}</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">{t('columns.action')}</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)] md:table-cell">{t('columns.document')}</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)] lg:table-cell">{t('columns.version')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {auditLogs.docs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-muted-foreground)]">
                        Keine Einträge für den gewählten Zeitraum.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.docs.map((log) => (
                      <tr key={String(log.id)} className="hover:bg-[var(--color-muted)] transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">
                          {log.timestamp
                            ? format(new Date(String(log.timestamp)), 'dd.MM.yy HH:mm', { locale: de })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{String(log.userName || '—')}</p>
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--color-muted-foreground)] sm:table-cell">
                          <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">
                            {String(log.userRole || '—')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-[var(--color-foreground)]">
                            {ACTION_LABELS[String(log.action)] ?? String(log.action)}
                          </span>
                        </td>
                        <td className="hidden max-w-xs truncate px-4 py-3 text-[var(--color-muted-foreground)] md:table-cell">
                          {(() => {
                            const auditDocId = extractId(log.documentId)
                            return auditDocId ? (
                              <Link href={`/${locale}/dokumente/${auditDocId}`} className="hover:text-[var(--color-primary)] hover:underline">
                                {String(log.documentTitle || auditDocId)}
                              </Link>
                            ) : '—'
                          })()}
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)] lg:table-cell">
                          {log.documentVersion ? `v${String(log.documentVersion)}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {auditLogs.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Seite {auditLogs.page} von {auditLogs.totalPages} · {auditLogs.totalDocs} Einträge
                </p>
                <div className="flex gap-2">
                  {auditLogs.hasPrevPage && (
                    <Link
                      href={`?tab=audit${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}&page=${page - 1}`}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-[var(--color-muted)]"
                    >
                      ← Zurück
                    </Link>
                  )}
                  {auditLogs.hasNextPage && (
                    <Link
                      href={`?tab=audit${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}&page=${page + 1}`}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-[var(--color-muted)]"
                    >
                      Weiter →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Training / read confirmations tab */}
        {tab === 'training' && readConfirmations && (
          <div className="rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
              <h2 className="font-semibold">{t('trainingStatus')}</h2>
              <a
                href={`/api/reports/training?format=csv`}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-muted)]"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">{t('columns.user')}</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">{t('columns.document')}</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)] sm:table-cell">{t('columns.version')}</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">{t('columns.confirmed')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {readConfirmations.docs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-[var(--color-muted-foreground)]">
                        Noch keine Lesebestätigungen vorhanden.
                      </td>
                    </tr>
                  ) : (
                    readConfirmations.docs.map((conf) => {
                      const confirmedUser = typeof conf.user === 'object' && conf.user !== null ? conf.user as Record<string, unknown> : null
                      const confirmedDoc = typeof conf.document === 'object' && conf.document !== null ? conf.document as Record<string, unknown> : null
                      const confirmedDocId = confirmedDoc ? extractId(confirmedDoc.id) : ''
                      const confirmedDocTitle = confirmedDoc ? String(confirmedDoc.title || confirmedDocId || '—') : '—'
                      return (
                        <tr key={String(conf.id)} className="hover:bg-[var(--color-muted)] transition-colors">
                          <td className="px-4 py-3 font-medium">
                            {confirmedUser ? String(confirmedUser.name || confirmedUser.email || '—') : '—'}
                          </td>
                          <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                            {confirmedDocId ? (
                              <Link href={`/${locale}/dokumente/${confirmedDocId}`} className="hover:text-[var(--color-primary)] hover:underline">
                                {confirmedDocTitle}
                              </Link>
                            ) : '—'}
                          </td>
                          <td className="hidden px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)] sm:table-cell">
                            v{String(conf.documentVersion || '—')}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[var(--color-muted-foreground)]">
                            {conf.confirmedAt
                              ? format(new Date(String(conf.confirmedAt)), 'dd.MM.yyyy HH:mm', { locale: de })
                              : '—'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expiring documents tab */}
        {tab === 'expiring' && expiringDocs && (
          <div className="rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
              <h2 className="font-semibold">{t('expiringDocuments')}</h2>
              <span className="text-sm text-[var(--color-muted-foreground)]">Nächste 90 Tage</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Nummer</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Titel</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)] sm:table-cell">Typ</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Gültig bis</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)] md:table-cell">Verantwortlich</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {expiringDocs.docs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-[var(--color-muted-foreground)]">
                        Keine ablaufenden Dokumente in den nächsten 90 Tagen.
                      </td>
                    </tr>
                  ) : (
                    expiringDocs.docs.map((doc) => {
                      const daysLeft = doc.validUntil
                        ? Math.ceil((new Date(String(doc.validUntil)).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null
                      const urgencyColor =
                        daysLeft !== null && daysLeft <= 7
                          ? 'text-red-600 font-semibold'
                          : daysLeft !== null && daysLeft <= 14
                          ? 'text-orange-600 font-medium'
                          : 'text-[var(--color-muted-foreground)]'
                      return (
                        <tr key={String(doc.id)} className="hover:bg-[var(--color-muted)] transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">
                            {String(doc.documentNumber || '—')}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/${locale}/dokumente/${extractId(doc.id)}`} className="font-medium text-[var(--color-primary)] hover:underline">
                              {String(doc.title)}
                            </Link>
                          </td>
                          <td className="hidden px-4 py-3 text-[var(--color-muted-foreground)] sm:table-cell">
                            {String(doc.documentType || '—')}
                          </td>
                          <td className={`px-4 py-3 ${urgencyColor}`}>
                            {doc.validUntil
                              ? format(new Date(String(doc.validUntil)), 'dd.MM.yyyy', { locale: de })
                              : '—'}
                            {daysLeft !== null && (
                              <span className="ml-1 text-xs">({daysLeft}d)</span>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 text-[var(--color-muted-foreground)] md:table-cell">
                            {typeof doc.owner === 'object' ? String(doc.owner.name || '—') : '—'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
