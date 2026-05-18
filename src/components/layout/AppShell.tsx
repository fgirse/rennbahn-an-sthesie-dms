'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import type { UserRole } from '@/lib/types'

interface AppShellProps {
  children: React.ReactNode
  locale: string
  userRole: UserRole
  userName: string
  pageTitle?: string
}

export function AppShell({ children, locale, userRole, userName, pageTitle }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-muted)]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar locale={locale} userRole={userRole} userName={userName} />
      </div>

      {/* Mobile Nav Drawer */}
      <MobileNav
        locale={locale}
        userRole={userRole}
        userName={userName}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          locale={locale}
          pageTitle={pageTitle}
          onMenuToggle={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
