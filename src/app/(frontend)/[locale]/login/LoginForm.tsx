'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

interface Props {
  locale: string
}

type Step = 'credentials' | 'mfa'

export function LoginForm({ locale }: Props) {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || `/${locale}`

  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(t('invalidCredentials'))
        return
      }

      if (data.requiresMFA) {
        setStep('mfa')
        return
      }

      window.location.href = redirectTo
    } catch {
      setError(t('invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  async function handleMFA(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: mfaCode }),
      })

      if (!res.ok) {
        setError('Ungültiger MFA-Code. Bitte erneut versuchen.')
        return
      }

      window.location.href = redirectTo
    } catch {
      setError('MFA-Verifizierung fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'mfa') {
    return (
      <form onSubmit={handleMFA} className="space-y-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="5" y="11" width="14" height="10" rx="2"/>
              <path d="M8 11V7a4 4 0 018 0v4"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{t('mfaTitle')}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('mfaDescription')}</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)]">{t('mfaCode')}</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
            className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-4 py-2.5 text-center text-2xl tracking-widest focus:border-[var(--color-ring)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
            placeholder="000000"
            autoFocus
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || mfaCode.length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('verifyMfa')}
        </button>

        <button
          type="button"
          onClick={() => setStep('credentials')}
          className="w-full text-center text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          ← {t('mfaBackupCode')}
        </button>
      </form>
    )
  }

  return (
    <div className="space-y-5">
      {/* SSO Button */}
      {process.env.NEXT_PUBLIC_SAML_ENABLED === 'true' && (
        <>
          <a
            href="/api/auth/saml/login"
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-accent)] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/>
            </svg>
            {t('ssoLogin')}
          </a>
          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-muted-foreground)]">oder</span>
            <div className="flex-1 border-t border-[var(--color-border)]" />
          </div>
        </>
      )}

      {/* Email/password form */}
      <form onSubmit={handleCredentials} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)]">{t('email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-4 py-2.5 text-sm focus:border-[var(--color-ring)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
            placeholder="name@rennbahnklinik.ch"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{t('password')}</label>
            <button type="button" className="text-xs text-[var(--color-secondary)] hover:underline">
              {t('forgotPassword')}
            </button>
          </div>
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-[var(--color-input)] px-4 py-2.5 pr-10 text-sm focus:border-[var(--color-ring)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('login')}
        </button>
      </form>
    </div>
  )
}
