import { getTranslations } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Archive, FileText } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge'
import { ApprovalWorkflow } from '@/components/documents/ApprovalWorkflow'
import { ReadConfirmationSection } from '@/components/documents/ReadConfirmationSection'
import { DocumentViewer } from '@/components/documents/DocumentViewer'
import { UserRole, DocumentStatus } from '@/lib/types'
import { writeDocumentReadAudit } from '@/lib/audit/logger'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function DocumentDetailPage({ params }: Props) {
  const { locale, id } = await params
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

  let doc
  try {
    doc = await payload.findByID({
      collection: 'documents',
      id,
      depth: 2,
      locale: locale as 'de' | 'en' | 'fr' | 'it',
      overrideAccess: false,
      user,
    })
  } catch {
    notFound()
  }

  if (!doc) notFound()

  // Log document read
  await writeDocumentReadAudit(
    payload,
    String(user.id),
    userName,
    userRole,
    String(doc.id),
    String(doc.title),
    String(doc.currentVersion || '1.0'),
    'server'
  )

  // Check if user already confirmed this version
  const confirmations = await payload.find({
    collection: 'read-confirmations',
    where: {
      and: [
        { user: { equals: user.id } },
        { document: { equals: doc.id } },
        { documentVersion: { equals: doc.currentVersion } },
      ],
    },
    limit: 1,
  })
  const alreadyConfirmed = confirmations.docs.length > 0
  const confirmedAt = alreadyConfirmed ? confirmations.docs[0].confirmedAt : null

  const statusLabels: Record<string, string> = {
    entwurf: t('statuses.entwurf'),
    in_pruefung: t('statuses.in_pruefung'),
    freigegeben: t('statuses.freigegeben'),
    in_revision: t('statuses.in_revision'),
    archiviert: t('statuses.archiviert'),
  }

  const canApprove =
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.QM_OFFICER ||
    userRole === UserRole.DEPT_HEAD

  const canReview = canApprove || userRole === UserRole.PHYSICIAN
  const isArchived = doc.status === DocumentStatus.ARCHIVED
  const contentFile = typeof doc.content === 'object' ? doc.content : null

  return (
    <AppShell locale={locale} userRole={userRole} userName={userName} pageTitle={String(doc.title)}>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back + actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/${locale}/dokumente`} className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            <ArrowLeft className="h-4 w-4" />
            {t('title')}
          </Link>
          {contentFile && (
            <a
              href={String(contentFile.url || '')}
              download
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-muted)]"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          )}
        </div>

        {/* Document header card */}
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[var(--color-accent)] p-3">
                <FileText className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-xs font-mono text-[var(--color-muted-foreground)]">
                  {String(doc.documentNumber || '—')} · v{String(doc.currentVersion || '1.0')}
                </p>
                <h1 className="mt-0.5 text-xl font-bold text-[var(--color-foreground)]">{String(doc.title)}</h1>
                {doc.description && (
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{String(doc.description)}</p>
                )}
              </div>
            </div>
            <DocumentStatusBadge
              status={String(doc.status)}
              label={statusLabels[String(doc.status)] ?? String(doc.status)}
            />
          </div>

          {/* Metadata grid */}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
            {[
              { label: t('documentType'), value: String(doc.documentType || '—') },
              {
                label: t('owner'),
                value: typeof doc.owner === 'object' ? String(doc.owner.name || '—') : '—',
              },
              {
                label: t('validUntil'),
                value: doc.validUntil
                  ? new Date(String(doc.validUntil)).toLocaleDateString(locale === 'de' ? 'de-CH' : locale)
                  : '—',
              },
              { label: 'Aufbewahrung bis', value: doc.retentionUntil ? new Date(String(doc.retentionUntil)).toLocaleDateString() : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
                <p className="font-medium text-[var(--color-foreground)]">{value}</p>
              </div>
            ))}
          </div>

          {isArchived && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <Archive className="h-4 w-4" />
              Dieses Dokument ist archiviert (WORM — unveränderlich).
            </div>
          )}
        </div>

        {/* Document viewer */}
        {contentFile?.url && (
          <DocumentViewer
            url={String(contentFile.url)}
            filename={String((contentFile as Record<string, unknown>).filename || doc.title)}
            mimeType={String((contentFile as Record<string, unknown>).mimeType || '')}
          />
        )}

        {/* Approval workflow */}
        {!isArchived && (canReview || canApprove) && (
          <ApprovalWorkflow
            documentId={String(doc.id)}
            documentTitle={String(doc.title)}
            currentVersion={String(doc.currentVersion || '1.0')}
            status={String(doc.status)}
            locale={locale}
            userRole={userRole}
          />
        )}

        {/* Read confirmation */}
        {doc.requiresReadConfirmation && doc.status === DocumentStatus.APPROVED && (
          <ReadConfirmationSection
            documentId={String(doc.id)}
            documentTitle={String(doc.title)}
            documentVersion={String(doc.currentVersion || '1.0')}
            alreadyConfirmed={alreadyConfirmed}
            confirmedAt={confirmedAt ? String(confirmedAt) : null}
            locale={locale}
          />
        )}

        {/* Change log */}
        {doc.changeLog && Array.isArray(doc.changeLog) && doc.changeLog.length > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold">{t('detail.history')}</h3>
            <div className="space-y-2">
              {[...doc.changeLog].reverse().map((entry: { version?: string; date?: string; description?: string }, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-muted-foreground)]">
                    v{entry.version}
                  </span>
                  <div>
                    <p className="text-[var(--color-foreground)]">{entry.description || '—'}</p>
                    {entry.date && (
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {new Date(entry.date).toLocaleDateString(locale === 'de' ? 'de-CH' : locale)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
