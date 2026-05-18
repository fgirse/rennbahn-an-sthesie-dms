'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, Menu, Globe } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'

interface Notification {
  id: string
  message: string
  type: string
  isRead: boolean
  link?: string
  createdAt: string
}

interface HeaderProps {
  locale: string
  pageTitle?: string
  onMenuToggle?: () => void
}

const LOCALES = [
  { code: 'de', label: 'DE' },
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'it', label: 'IT' },
]

export function Header({ locale, pageTitle, onMenuToggle }: HeaderProps) {
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)

  // Poll for notifications every 60s
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/notifications?where[isRead][equals]=false&limit=10')
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.docs || [])
        }
      } catch {
        // Network error — silently ignore
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/')
    segments[1] = newLocale
    router.push(segments.join('/'))
    setShowLangMenu(false)
  }

  async function markAllRead() {
    for (const notif of notifications.filter((n) => !n.isRead)) {
      await fetch(`/api/notifications/${notif.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      })
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-white px-4 lg:px-6">
      {/* Mobile menu toggle + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-2 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] lg:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {pageTitle && (
          <h1 className="text-lg font-semibold text-[var(--color-foreground)]">{pageTitle}</h1>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{locale.toUpperCase()}</span>
          </button>
          {showLangMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-24 rounded-lg border border-[var(--color-border)] bg-white shadow-lg">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => switchLocale(l.code)}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-muted)] transition-colors',
                    l.code === locale ? 'font-semibold text-[var(--color-primary)]' : 'text-[var(--color-foreground)]'
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-md p-2 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors"
            aria-label={t('notifications.title')}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-[var(--color-border)] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="font-semibold text-sm">{t('notifications.title')}</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-[var(--color-secondary)] hover:underline">
                    {t('notifications.markAllRead')}
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
                    {t('notifications.noNotifications')}
                  </p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        'border-b px-4 py-3 last:border-0',
                        !notif.isRead ? 'bg-[var(--color-accent)]' : ''
                      )}
                    >
                      {notif.link && !String(notif.link).includes('[object Object]') ? (
                        <Link
                          href={`/${locale}${notif.link}`}
                          onClick={() => setShowNotifications(false)}
                          className="block text-sm text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
                        >
                          {notif.message}
                        </Link>
                      ) : (
                        <p className="text-sm text-[var(--color-foreground)]">{notif.message}</p>
                      )}
                      <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                        {new Date(notif.createdAt).toLocaleString(locale === 'de' ? 'de-CH' : locale)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
