'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle, Loader2, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { de, enUS, fr, it } from 'date-fns/locale'

const dateFnsLocales = { de, en: enUS, fr, it }

interface Props {
  documentId: string
  documentTitle: string
  documentVersion: string
  alreadyConfirmed: boolean
  confirmedAt: string | null
  locale: string
}

export function ReadConfirmationSection({
  documentId,
  documentTitle,
  documentVersion,
  alreadyConfirmed,
  confirmedAt,
  locale,
}: Props) {
  const t = useTranslations('documents.detail')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [done, setDone] = useState(alreadyConfirmed)
  const [doneAt, setDoneAt] = useState(confirmedAt)

  const dtLocale = dateFnsLocales[locale as keyof typeof dateFnsLocales] || de

  async function handleConfirm() {
    setLoading(true)
    try {
      const res = await fetch('/api/read-confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: documentId, documentVersion }),
      })
      if (res.ok) {
        setDone(true)
        setDoneAt(new Date().toISOString())
        setShowDialog(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (done && doneAt) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
        <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
        <p className="text-sm text-green-800">
          {t('alreadyConfirmed', {
            date: format(new Date(doneAt), 'PPP', { locale: dtLocale }),
          })}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">{t('confirmationRequired')}</p>
            <button
              onClick={() => setShowDialog(true)}
              className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <CheckCircle className="h-4 w-4" />
              {t('readAndConfirm')}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">{t('confirmationDialog.title')}</h3>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {t('confirmationDialog.description', { title: documentTitle, version: documentVersion })}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('confirmationDialog.confirm')}
              </button>
              <button
                onClick={() => setShowDialog(false)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm hover:bg-[var(--color-muted)]"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
