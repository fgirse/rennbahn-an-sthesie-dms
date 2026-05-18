import { getTranslations } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { UserRole } from '@/lib/types'
import { SettingsTabs } from '@/components/settings/SettingsTabs'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('settings')

  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) redirect(`/${locale}/login`)

  const payload = await getPayload({ config })
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })
  if (!user) redirect(`/${locale}/login`)

  const userRole = (user as { role?: string }).role as UserRole
  const u = user as Record<string, unknown>
  const userName = (u.name as string) || `${u.firstName || ''} ${u.lastName || ''}`.trim()

  return (
    <AppShell locale={locale} userRole={userRole} userName={userName} pageTitle={t('title')}>
      <SettingsTabs
        userId={String(user.id)}
        userEmail={String(u.email || '')}
        userName={userName}
        firstName={String(u.firstName || '')}
        lastName={String(u.lastName || '')}
        userRole={userRole}
        mfaEnabled={Boolean(u.mfaEnabled)}
        preferredLanguage={String(u.preferredLanguage || locale)}
        locale={locale}
      />
    </AppShell>
  )
}
