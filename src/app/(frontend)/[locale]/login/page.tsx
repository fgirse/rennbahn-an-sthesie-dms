import { getTranslations } from 'next-intl/server'
import { LoginForm } from './LoginForm'
import Image from 'next/image'
import LogoRennbahnKlinik from '../../../../../public/Assets/Img/Logo_violett_Rennbahn.png';

type Props = { params: Promise<{ locale: string }> }

export default async function LoginPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('auth')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] p-4">
      <div className="w-full max-w-md">
        {/* Logo card */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <svg viewBox="0 0 24 24" className="h-9 w-9 text-[var(--color-primary)]" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 10 12 6.16-1.26 10-6.45 10-12V7L12 2zm0 4l6 3v8c0 3.73-2.47 7.18-6 8.39C8.47 24.18 6 20.73 6 17V9l6-3z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">{t('loginTitle')}</h1>
          <p className="mt-1 text-sm text-white/70">{t('loginSubtitle')}</p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <LoginForm locale={locale} />
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center justify-center">
          <Image src={LogoRennbahnKlinik} alt="Rennbahnklinik Logo" className="mt-6 h-24 w-auto rounded-xl" />
          <p className="mt-6 text-center text-xs text-white/50">
            Rennbahnklinik Muttenz · Abteilung Anästhesiologie
          </p>
        </div>
      </div>
    </div>
  )
}
