'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { DocumentType, WorkflowType } from '@/lib/types'

interface UserOption {
  id: string
  name: string
  role: string
}

interface Props {
  locale: string
  currentUserId: string
  userOptions: UserOption[]
}

const DOC_TYPES = Object.values(DocumentType)
const WORKFLOW_TYPES = Object.values(WorkflowType)

const docTypeLabels: Record<string, string> = {
  sop: 'SOP',
  notfall_checkliste: 'Notfall-Checkliste',
  arbeitsplatz_checkliste: 'Arbeitsplatz-Checkliste',
  einwilligungsbogen: 'Einwilligungsbogen',
  qualitaetsdokument: 'Qualitätsdokument',
  formular_vorlage: 'Formular / Vorlage',
  schulungsunterlage: 'Schulungsunterlage',
  geraete_wartung: 'Geräte-/Wartungsdokumentation',
}

const workflowLabels: Record<string, string> = {
  einstufig: 'Einstufig (1 Freigeber)',
  zweistufig: 'Zweistufig (2 Freigeber)',
  dreistufig: 'Dreistufig (3 Freigeber)',
}

const ACCEPTED_TYPES = '.pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export function NewDocumentForm({ locale, currentUserId, userOptions }: Props) {
  const t = useTranslations('documents')
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [docType, setDocType] = useState<DocumentType>(DocumentType.SOP)
  const [workflowType, setWorkflowType] = useState<WorkflowType>(WorkflowType.SINGLE)
  const [owner, setOwner] = useState(currentUserId)
  const [reviewers, setReviewers] = useState<string[]>([])
  const [approvers, setApprovers] = useState<string[]>([currentUserId])
  const [validUntil, setValidUntil] = useState('')
  const [requiresReadConfirmation, setRequiresReadConfirmation] = useState(true)
  const [changeDescription, setChangeDescription] = useState('Erstversion')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(f: File) {
    if (f.size > MAX_FILE_SIZE) {
      setError('Datei ist zu groß (max. 50 MB).')
      return
    }
    setFile(f)
    setError('')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Bitte geben Sie einen Titel ein.'); return }
    if (!file) { setError('Bitte laden Sie ein Dokument hoch.'); return }

    setUploading(true)
    setError('')

    try {
      // Step 1: upload file to media collection
      const formData = new FormData()
      formData.append('file', file)

      const mediaRes = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      })
      if (!mediaRes.ok) {
        const errData = await mediaRes.json().catch(() => ({}))
        setError(errData.errors?.[0]?.message || 'Fehler beim Hochladen der Datei.')
        return
      }
      const mediaData = await mediaRes.json()
      const mediaId = mediaData.doc?.id

      // Step 2: create document record
      const maxReviewers = workflowType === WorkflowType.SINGLE ? 0 : workflowType === WorkflowType.TWO_STAGE ? 1 : 2
      const maxApprovers = workflowType === WorkflowType.SINGLE ? 1 : workflowType === WorkflowType.TWO_STAGE ? 2 : 3

      const docPayload = {
        title,
        description,
        documentType: docType,
        workflowType,
        owner,
        reviewers: reviewers.slice(0, maxReviewers),
        approvers: approvers.slice(0, maxApprovers),
        content: mediaId,
        validUntil: validUntil || undefined,
        requiresReadConfirmation,
        changeLog: [{ description: changeDescription }],
      }

      const docRes = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docPayload),
      })

      if (!docRes.ok) {
        const errData = await docRes.json().catch(() => ({}))
        setError(errData.errors?.[0]?.message || 'Fehler beim Erstellen des Dokuments.')
        return
      }

      const docData = await docRes.json()
      router.push(`/${locale}/dokumente/${String(docData.doc?.id)}`)
    } finally {
      setUploading(false)
    }
  }

  const numApprovers = workflowType === WorkflowType.SINGLE ? 1 : workflowType === WorkflowType.TWO_STAGE ? 2 : 3

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          Titel <span className="text-red-500">*</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
          placeholder="z.B. SOP Intubationsprotokoll"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          Beschreibung
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
          placeholder="Kurze Beschreibung des Dokuments..."
        />
      </div>

      {/* Type + Workflow */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)]">
            Dokumenttyp <span className="text-red-500">*</span>
          </label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>{docTypeLabels[t] ?? t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)]">
            Freigabe-Workflow <span className="text-red-500">*</span>
          </label>
          <select
            value={workflowType}
            onChange={(e) => setWorkflowType(e.target.value as WorkflowType)}
            className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
          >
            {WORKFLOW_TYPES.map((wt) => (
              <option key={wt} value={wt}>{workflowLabels[wt] ?? wt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Owner */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          Verantwortlicher <span className="text-red-500">*</span>
        </label>
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
        >
          {userOptions.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Approvers */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          Freigeber ({numApprovers} benötigt)
        </label>
        <div className="mt-1 space-y-2">
          {Array.from({ length: numApprovers }).map((_, i) => (
            <select
              key={i}
              value={approvers[i] || ''}
              onChange={(e) => {
                const updated = [...approvers]
                updated[i] = e.target.value
                setApprovers(updated)
              }}
              className="block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
            >
              <option value="">— Freigeber {i + 1} wählen —</option>
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* Valid until */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          Gültig bis
        </label>
        <input
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="mt-1 block rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
        />
      </div>

      {/* Read confirmation */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="requiresReadConfirmation"
          checked={requiresReadConfirmation}
          onChange={(e) => setRequiresReadConfirmation(e.target.checked)}
          className="h-4 w-4 rounded accent-[var(--color-primary)]"
        />
        <label htmlFor="requiresReadConfirmation" className="text-sm font-medium text-[var(--color-foreground)]">
          Lesebestätigung erforderlich
        </label>
      </div>

      {/* Change description */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          Änderungsbeschreibung (für Changelog)
        </label>
        <input
          value={changeDescription}
          onChange={(e) => setChangeDescription(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
          placeholder="z.B. Erstversion"
        />
      </div>

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          Dokument <span className="text-red-500">*</span>
        </label>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
            dragOver
              ? 'border-[var(--color-primary)] bg-[var(--color-accent)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-accent)]'
          }`}
        >
          {file ? (
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-[var(--color-primary)]" />
              <div>
                <p className="font-medium text-[var(--color-foreground)]">{file.name}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null) }}
                className="ml-2 rounded-full p-1 hover:bg-[var(--color-muted)]"
              >
                <X className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-[var(--color-muted-foreground)]" />
              <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">{t('upload.dragDrop')}</p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{t('upload.supportedFormats')}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{t('upload.maxSize')}</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
          className="hidden"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={uploading || !title || !file}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          {uploading ? 'Wird hochgeladen...' : 'Dokument erstellen'}
        </button>
        <a
          href={`/${locale}/dokumente`}
          className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--color-muted)]"
        >
          Abbrechen
        </a>
      </div>
    </form>
  )
}
