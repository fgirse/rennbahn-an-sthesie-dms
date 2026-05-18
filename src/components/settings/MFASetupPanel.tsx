'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, CheckCircle } from 'lucide-react'

interface Props {
  enabled: boolean
  onEnabled: () => void
  onDisabled: () => void
}

interface SetupData {
  secret: string
  otpAuthUrl: string
  qrCodeDataUrl: string
  backupCodes: string[]
}

export function MFASetupPanel({ enabled, onEnabled, onDisabled }: Props) {
  const t = useTranslations('settings.mfa')
  const [step, setStep] = useState<'idle' | 'setup' | 'verify' | 'backup' | 'disable'>('idle')
  const [loading, setLoading] = useState(false)
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState('')
  const [copiedBackup, setCopiedBackup] = useState(false)

  async function startSetup() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/mfa/setup', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSetupData(data)
        setStep('setup')
      } else {
        setError(data.message || 'Fehler beim Einrichten der MFA.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function verifyAndEnable() {
    if (!verifyCode || verifyCode.length !== 6) {
      setError('Bitte geben Sie einen gültigen 6-stelligen Code ein.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode, secret: setupData?.secret }),
      })
      const data = await res.json()
      if (res.ok) {
        setStep('backup')
        if (data.backupCodes) {
          setSetupData((prev) => prev ? { ...prev, backupCodes: data.backupCodes } : prev)
        }
        onEnabled()
      } else {
        setError(data.message || 'Ungültiger Code. Bitte erneut versuchen.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function disableMFA() {
    if (!verifyCode || verifyCode.length < 6) {
      setError('Bitte geben Sie den Code ein, um MFA zu deaktivieren.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      })
      if (res.ok) {
        setStep('idle')
        setVerifyCode('')
        onDisabled()
      } else {
        const data = await res.json()
        setError(data.message || 'Ungültiger Code.')
      }
    } finally {
      setLoading(false)
    }
  }

  function copyBackupCodes() {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'))
      setCopiedBackup(true)
      setTimeout(() => setCopiedBackup(false), 2000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className={`rounded-xl p-2 ${enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
          {enabled ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <Shield className="h-5 w-5 text-gray-500" />
          )}
        </div>
        <div>
          <h3 className="font-semibold">{t('title')}</h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {enabled ? t('enabled') : t('disabled')}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Idle state */}
      {step === 'idle' && (
        <div>
          {!enabled ? (
            <button
              onClick={startSetup}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('setup')}
            </button>
          ) : (
            <button
              onClick={() => { setStep('disable'); setVerifyCode(''); setError('') }}
              className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <ShieldOff className="h-4 w-4" />
              {t('disable')}
            </button>
          )}
        </div>
      )}

      {/* Setup: show QR code */}
      {step === 'setup' && setupData && (
        <div className="space-y-4 rounded-xl border border-[var(--color-border)] p-5">
          <p className="text-sm font-medium">{t('scanQr')}</p>
          {/* QR code image */}
          {setupData.qrCodeDataUrl && (
            <img
              src={setupData.qrCodeDataUrl}
              alt="TOTP QR Code"
              className="h-40 w-40 rounded-lg border border-[var(--color-border)]"
            />
          )}
          <div>
            <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Manueller Code:</p>
            <code className="block rounded bg-[var(--color-muted)] px-3 py-2 text-xs font-mono break-all">
              {setupData.secret}
            </code>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">{t('enterCode')}</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-32 rounded-lg border border-[var(--color-input)] px-3 py-2 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
              />
              <button
                onClick={verifyAndEnable}
                disabled={loading || verifyCode.length !== 6}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Bestätigen
              </button>
              <button
                onClick={() => { setStep('idle'); setSetupData(null); setVerifyCode('') }}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-muted)]"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup codes */}
      {step === 'backup' && setupData?.backupCodes && (
        <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="font-semibold text-green-900">MFA erfolgreich aktiviert!</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">{t('backupCodes')}</p>
            <p className="mb-3 text-xs text-[var(--color-muted-foreground)]">{t('backupCodesDescription')}</p>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-white p-3 font-mono text-sm">
              {setupData.backupCodes.map((code, i) => (
                <span key={i} className="px-2 py-1">{code}</span>
              ))}
            </div>
            <button
              onClick={copyBackupCodes}
              className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-muted)]"
            >
              {copiedBackup ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedBackup ? 'Kopiert!' : 'Codes kopieren'}
            </button>
          </div>
          <button
            onClick={() => { setStep('idle'); setSetupData(null) }}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Fertig
          </button>
        </div>
      )}

      {/* Disable confirm */}
      {step === 'disable' && (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-900">
            Geben Sie Ihren Authenticator-Code ein, um MFA zu deaktivieren:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-32 rounded-lg border border-[var(--color-input)] bg-white px-3 py-2 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <button
              onClick={disableMFA}
              disabled={loading || verifyCode.length < 6}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              MFA deaktivieren
            </button>
            <button
              onClick={() => { setStep('idle'); setVerifyCode(''); setError('') }}
              className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm hover:bg-[var(--color-muted)]"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
