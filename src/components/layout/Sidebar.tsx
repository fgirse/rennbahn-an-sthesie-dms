'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  BarChart2,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { UserRole } from '@/lib/types'

interface SidebarProps {
  locale: string
  userRole: UserRole
  userName: string
}

export function Sidebar({ locale, userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')

  const navItems = [
    {
      href: `/${locale}`,
      label: t('dashboard'),
      icon: LayoutDashboard,
      roles: Object.values(UserRole),
    },
    {
      href: `/${locale}/dokumente`,
      label: t('documents'),
      icon: FileText,
      roles: Object.values(UserRole),
    },
    {
      href: `/${locale}/aufgaben`,
      label: t('tasks'),
      icon: CheckSquare,
      roles: Object.values(UserRole),
    },
    {
      href: `/${locale}/berichte`,
      label: t('reports'),
      icon: BarChart2,
      roles: [UserRole.SYSTEM_ADMIN, UserRole.QM_OFFICER, UserRole.DEPT_HEAD, UserRole.AUDITOR],
    },
    {
      href: `/${locale}/einstellungen`,
      label: t('settings'),
      icon: Settings,
      roles: Object.values(UserRole),
    },
  ]

  const showAdminLink =
    userRole === UserRole.SYSTEM_ADMIN || userRole === UserRole.QM_OFFICER

  return (
    <aside className="flex h-full w-64 flex-col bg-[var(--color-primary)] text-white">
      {/* Logo / Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
        <ShieldCheck className="h-8 w-8 text-white/90" />
        <div>
          <p className="text-sm font-bold leading-tight">DMS</p>
          <p className="text-xs text-white/60 leading-tight">Rennbahnklinik</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems
          .filter((item) => item.roles.includes(userRole))
          .map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}

        {showAdminLink && (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            {t('admin')}
          </Link>
        )}
      </nav>

      {/* User / Logout */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
          </div>
        </div>
        <form action={`/api/users/logout`} method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t('logout')}
          </button>
        </form>
      </div>
    </aside>
  )
}
