'use client'

import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Download, ChevronDown, ChevronUp, FileText, Image, Loader2 } from 'lucide-react'

// Webpack emits the worker as a static asset under /_next/static/chunks/ (same-origin).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

// Defined outside the component so the object reference is stable (react-pdf equality check).
const PDF_OPTIONS = { withCredentials: true }

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
  const [numPages, setNumPages] = useState<number | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const category = getMimeCategory(url, mimeType)

  // Measure the container so each PDF page fills the available width on any screen size.
  // Re-runs when expanded changes so the ref is populated after the div mounts.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [expanded])

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
          <span className="text-sm font-medium text-[var(--color-foreground)] truncate max-w-[160px] sm:max-w-xs">
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
            <span className="hidden sm:inline">Download</span>
          </a>
          {category !== 'other' && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-muted)]"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{expanded ? 'Schliessen' : 'Vorschau'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Viewer area */}
      {expanded && (
        <>
          {/* PDF: rendered page-by-page via PDF.js — works on all devices */}
          {category === 'pdf' && (
            <div
              ref={containerRef}
              className="w-full overflow-y-auto bg-[var(--color-muted)]"
              style={{ maxHeight: '80vh' }}
            >
              {loadError ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
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
              ) : (
                <Document
                  file={url}
                  options={PDF_OPTIONS}
                  onLoadSuccess={({ numPages: n }) => { setNumPages(n); setLoadError(false) }}
                  onLoadError={() => setLoadError(true)}
                  loading={
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
                    </div>
                  }
                  className="py-4"
                >
                  {numPages &&
                    Array.from({ length: numPages }, (_, i) => (
                      <div key={i + 1} className="flex justify-center px-4 pb-3">
                        <Page
                          pageNumber={i + 1}
                          width={containerWidth > 32 ? containerWidth - 32 : undefined}
                          renderAnnotationLayer
                          renderTextLayer
                        />
                      </div>
                    ))}
                </Document>
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
