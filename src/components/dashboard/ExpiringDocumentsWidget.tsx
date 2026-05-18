import { getTranslations } from 'next-intl/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { DocumentStatus } from '@/lib/types'

interface Props {
  locale: string
}

export async function ExpiringDocumentsWidget({ locale }: Props) {
  const t = await getTranslations()
  const payload = await getPayload({ config })

  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  const docs = await payload.find({
    collection: 'documents',
    where: {
      and: [
        { status: { equals: DocumentStatus.APPROVED } },
        { validUntil: { less_than: thirtyDays } },
        { validUntil: { greater_than: now } },
      ],
    },
    limit: 5,
    sort: 'validUntil',
    depth: 0,
  })

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
        <h3 className="font-semibold text-[var(--color-foreground)]">{t('dashboard.expiringDocuments')}</h3>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {docs.docs.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
            Keine Dokumente laufen in den nächsten 30 Tagen ab.
          </p>
        ) : (
          docs.docs.map((doc) => {
            const daysLeft = doc.validUntil
              ? Math.ceil((new Date(String(doc.validUntil)).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null
            return (
              <Link
                key={String(doc.id)}
                href={`/${locale}/dokumente/${String(doc.id)}`}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--color-muted)] transition-colors"
              >
                <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${daysLeft !== null && daysLeft <= 7 ? 'text-red-500' : 'text-amber-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-foreground)]">{String(doc.title)}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {daysLeft !== null ? `Läuft in ${daysLeft} Tagen ab` : '—'}
                  </p>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
