import { getTranslations } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge'
import { UserRole, DocumentStatus } from '@/lib/types'
import type { Where } from 'payload'
import { extractId } from '@/lib/extractId'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; type?: string; status?: string; page?: string }>
}

export default async function DocumentsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q, type, status, page: pageParam } = await searchParams
  const t = await getTranslations('documents')

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
  const page = parseInt(pageParam || '1')

  const andClauses: Where[] = []
  if (type) andClauses.push({ documentType: { equals: type } })
  if (status) andClauses.push({ status: { equals: status } })
  if (q) andClauses.push({ or: [{ title: { like: q } }, { documentNumber: { like: q } }] })

  const docs = await payload.find({
    collection: 'documents',
    where: andClauses.length > 0 ? { and: andClauses } : {},
    page,
    limit: 20,
    sort: '-updatedAt',
    depth: 1,
    locale: locale as 'de' | 'en' | 'fr' | 'it',
    overrideAccess: false,
    user,
  })

  const canCreate =
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.QM_OFFICER ||
    userRole === UserRole.DEPT_HEAD ||
    userRole === UserRole.PHYSICIAN

  const statusLabels: Record<string, string> = {
    entwurf: t('statuses.entwurf'),
    in_pruefung: t('statuses.in_pruefung'),
    freigegeben: t('statuses.freigegeben'),
    in_revision: t('statuses.in_revision'),
    archiviert: t('statuses.archiviert'),
  }

  const typeLabels: Record<string, string> = {
    sop: t('types.sop'),
    notfall_checkliste: t('types.notfall_checkliste'),
    arbeitsplatz_checkliste: t('types.arbeitsplatz_checkliste'),
    einwilligungsbogen: t('types.einwilligungsbogen'),
    qualitaetsdokument: t('types.qualitaetsdokument'),
    formular_vorlage: t('types.formular_vorlage'),
    schulungsunterlage: t('types.schulungsunterlage'),
    geraete_wartung: t('types.geraete_wartung'),
  }

  return (
    <AppShell locale={locale} userRole={userRole} userName={userName} pageTitle={t('title')}>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form method="GET" className="flex flex-1 flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder={t('search')}
              className="min-w-48 flex-1 rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:border-[var(--color-ring)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
            />
            <select
              name="type"
              defaultValue={type}
              className="rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">{t('documentType')}: Alle</option>
              {Object.entries(typeLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={status}
              className="rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">{t('status')}: Alle</option>
              {Object.entries(statusLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              {t('search').split(' ')[0]}
            </button>
          </form>

          {canCreate && (
            <Link
              href={`/${locale}/dokumente/neu`}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              {t('new')}
            </Link>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">{t('documentNumber')}</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">{t('documentTitle')}</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)] sm:table-cell">{t('documentType')}</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">{t('status')}</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)] md:table-cell">{t('version')}</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)] lg:table-cell">{t('validUntil')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {docs.docs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-muted-foreground)]">
                      {t('noDocuments')}
                    </td>
                  </tr>
                ) : (
                  docs.docs.map((doc) => (
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
                        {typeLabels[String(doc.documentType)] ?? String(doc.documentType)}
                      </td>
                      <td className="px-4 py-3">
                        <DocumentStatusBadge
                          status={String(doc.status)}
                          label={statusLabels[String(doc.status)] ?? String(doc.status)}
                        />
                      </td>
                      <td className="hidden px-4 py-3 text-[var(--color-muted-foreground)] md:table-cell">
                        {String(doc.currentVersion || '—')}
                      </td>
                      <td className="hidden px-4 py-3 text-[var(--color-muted-foreground)] lg:table-cell">
                        {doc.validUntil
                          ? new Date(String(doc.validUntil)).toLocaleDateString(locale === 'de' ? 'de-CH' : locale)
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {docs.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Seite {docs.page} von {docs.totalPages} · {docs.totalDocs} Dokumente
              </p>
              <div className="flex gap-2">
                {docs.hasPrevPage && (
                  <Link
                    href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(type ? { type } : {}), ...(status ? { status } : {}), page: String(page - 1) })}`}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-[var(--color-muted)]"
                  >
                    ← Zurück
                  </Link>
                )}
                {docs.hasNextPage && (
                  <Link
                    href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(type ? { type } : {}), ...(status ? { status } : {}), page: String(page + 1) })}`}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-[var(--color-muted)]"
                  >
                    Weiter →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
