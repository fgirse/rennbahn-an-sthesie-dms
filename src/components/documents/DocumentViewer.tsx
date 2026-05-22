'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, ChevronDown, ChevronUp, FileText, Image, Loader2 } from 'lucide-react'

interface Props {
  url: string
  filename: string
  mimeType?: string
}

function getMimeCategory(url: string, mimeType?: string): 'pdf' | 'image' | 'other' {
  const mime = mimeType?.toLowerCase() || ''
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || ''

  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  return 'other'
}

export function DocumentViewer({ url, filename, mimeType }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const blobUrlRef = useRef<string | null>(null)
  const category = getMimeCategory(url, mimeType)

  // For PDFs: fetch via the authenticated proxy and create a blob: URL.
  // Using a blob: URL in the iframe avoids all X-Frame-Options / CSP frame-ancestors
  // restrictions that browsers enforce on HTTP responses — the definitive fix for
  // Firefox (and Safari) blocking the iframe in production.
  useEffect(() => {
    if (category !== 'pdf' || !expanded) return

    let cancelled = false
    setLoadError(false)
    setBlobUrl(null)

    fetch(url, { credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        // Force correct MIME type so the browser opens the PDF viewer, not a download
        const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
        const objectUrl = URL.createObjectURL(pdfBlob)
        blobUrlRef.current = objectUrl
        setBlobUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })

    return () => {
      cancelled = true
    }
  }, [url, category, expanded])

  // Revoke the blob URL when the component unmounts to free browser memory
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex items-center gap-2">
          {category === 'image' ? (
            <Image className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          ) : (
            <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          )}
          <span className="text-sm font-medium text-[var(--color-foreground)] truncate max-w-xs">
            {filename}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={url}
            download={filename}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-muted)]"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
          {category !== 'other' && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-muted)]"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? 'Schliessen' : 'Vorschau'}
            </button>
          )}
        </div>
      </div>

      {/* Viewer area */}
      {expanded && (
        <>
          {category === 'pdf' && (
            <div className="relative w-full" style={{ height: '70vh' }}>
              {!blobUrl && !loadError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-muted)]">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
                </div>
              )}
              {loadError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--color-muted)] text-center">
                  <FileText className="h-8 w-8 text-[var(--color-muted-foreground)]" />
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Vorschau konnte nicht geladen werden.
                  </p>
                  <a
                    href={url}
                    download={filename}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    <Download className="h-4 w-4" />
                    Datei herunterladen
                  </a>
                </div>
              )}
              {blobUrl && (
                <iframe
                  src={blobUrl}
                  title={filename}
                  className="h-full w-full border-0"
                  allow="fullscreen"
                />
              )}
            </div>
          )}

          {category === 'image' && (
            <div className="flex items-center justify-center bg-[var(--color-muted)] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={filename}
                className="max-h-[70vh] max-w-full rounded-lg object-contain shadow"
              />
            </div>
          )}

          {category === 'other' && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <FileText className="h-10 w-10 text-[var(--color-muted-foreground)]" />
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Vorschau für dieses Dateiformat nicht verfügbar.
              </p>
              <a
                href={url}
                download={filename}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                Datei herunterladen
              </a>
            </div>
          )}
        </>
      )}
    </div>
  )
}
