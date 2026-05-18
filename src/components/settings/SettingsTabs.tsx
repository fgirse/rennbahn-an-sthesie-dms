'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { User, Shield, Globe, Bell, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { UserRole } from '@/lib/types'
import { MFASetupPanel } from './MFASetupPanel'

interface Props {
  userId: string
  userEmail: string
  userName: string
  firstName: string
  lastName: string
  userRole: UserRole
  mfaEnabled: boolean
  preferredLanguage: string
  locale: string
}

const LOCALES = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'it', label: 'Italiano' },
]

export function SettingsTabs({
  userId,
  userEmail,
  userName,
  firstName,
  lastName,
  userRole,
  mfaEnabled: initialMfaEnabled,
  preferredLanguage,
  locale,
}: Props) {
  const t = useTranslations('settings')
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Profile form
  const [firstNameVal, setFirstNameVal] = useState(firstName)
  const [lastNameVal, setLastNameVal] = useState(lastName)
  const [langVal, setLangVal] = useState(preferredLanguage)

  // Password form
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(initialMfaEnabled)

  async function saveProfile() {
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstNameVal,
          lastName: lastNameVal,
          preferredLanguage: langVal,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        // Redirect if language changed
        if (langVal !== locale) {
          window.location.href = `/${langVal}/einstellungen`
        }
      } else {
        setError('Fehler beim Speichern des Profils.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function changePassword() {
    if (newPw !== confirmPw) {
      setError('Die neuen Passwörter stimmen nicht überein.')
      return
    }
    if (newPw.length < 12) {
      setError('Das Passwort muss mindestens 12 Zeichen lang sein.')
      return
    }
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      if (res.ok) {
        setSaved(true)
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await res.json()
        setError(data.message || 'Fehler beim Ändern des Passworts.')
      }
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: t('profile'), icon: User },
    { id: 'security', label: t('security'), icon: Shield },
    { id: 'language', label: t('language'), icon: Globe },
  ]

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      {/* Tab sidebar */}
      <nav className="flex flex-row gap-1 rounded-xl border border-[var(--color-border)] bg-white p-2 shadow-sm sm:flex-col sm:w-52">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setError(''); setSaved(false) }}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all w-full text-left ${
              activeTab === id
                ? 'bg-[var(--color-accent)] text-[var(--color-primary)]'
                : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="flex-1 rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
        {/* Feedback */}
        {saved && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            <CheckCircle className="h-4 w-4" />
            Gespeichert!
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">{t('profile')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">Vorname</label>
                <input
                  value={firstNameVal}
                  onChange={(e) => setFirstNameVal(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">Nachname</label>
                <input
                  value={lastNameVal}
                  onChange={(e) => setLastNameVal(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[var(--color-foreground)]">E-Mail</label>
                <input
                  value={userEmail}
                  disabled
                  className="mt-1 block w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[var(--color-foreground)]">Rolle</label>
                <input
                  value={userRole}
                  disabled
                  className="mt-1 block w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]"
                />
              </div>
            </div>
            <button
              onClick={saveProfile}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Profil speichern
            </button>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            {/* Password change */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t('password.change')}</h2>
              <div className="space-y-3 max-w-sm">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-foreground)]">{t('password.current')}</label>
                  <input
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-foreground)]">{t('password.new')}</label>
                  <div className="relative mt-1">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className="block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                    >
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{t('password.requirements')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-foreground)]">{t('password.confirm')}</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
                  />
                </div>
                <button
                  onClick={changePassword}
                  disabled={loading || !currentPw || !newPw || !confirmPw}
                  className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Passwort ändern
                </button>
              </div>
            </div>

            {/* MFA section */}
            <div className="border-t border-[var(--color-border)] pt-6">
              <MFASetupPanel
                enabled={mfaEnabled}
                onEnabled={() => setMfaEnabled(true)}
                onDisabled={() => setMfaEnabled(false)}
              />
            </div>
          </div>
        )}

        {/* Language tab */}
        {activeTab === 'language' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">{t('language')}</h2>
            <div className="space-y-2">
              {LOCALES.map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
                    langVal === value
                      ? 'border-[var(--color-primary)] bg-[var(--color-accent)]'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value={value}
                    checked={langVal === value}
                    onChange={() => setLangVal(value)}
                    className="accent-[var(--color-primary)]"
                  />
                  <span className="font-medium">{label}</span>
                </label>
              ))}
            </div>
            <button
              onClick={saveProfile}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sprache speichern
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
