'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import type { UserRole } from '@/lib/types'

interface MobileNavProps {
  locale: string
  userRole: UserRole
  userName: string
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ locale, userRole, userName, isOpen, onClose }: MobileNavProps) {
  // Close on escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div className="absolute left-0 top-0 h-full w-64 shadow-xl">
        <div className="relative h-full">
          <button
            onClick={onClose}
            className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <Sidebar locale={locale} userRole={userRole} userName={userName} />
        </div>
      </div>
    </div>
  )
}
