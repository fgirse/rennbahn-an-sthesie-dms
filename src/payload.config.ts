import { buildConfig } from 'payload'
import { de } from '@payloadcms/translations/languages/de'
import { en } from '@payloadcms/translations/languages/en'
import { fr } from '@payloadcms/translations/languages/fr'
import { it } from '@payloadcms/translations/languages/it'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { resendAdapter } from '@payloadcms/email-resend'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users/index'
import { Documents } from './collections/Documents/index'
import { Media } from './collections/Media/index'
import { AuditLogs } from './collections/AuditLogs/index'
import { ReadConfirmations } from './collections/ReadConfirmations/index'
import { ApprovalTasks } from './collections/ApprovalTasks/index'
import { Notifications } from './collections/Notifications/index'
import { DocumentCategories } from './collections/DocumentCategories/index'
import { SiteSettings } from './globals/SiteSettings/index'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const plugins = process.env.BLOB_READ_WRITE_TOKEN
  ? [
      vercelBlobStorage({
        enabled: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        collections: { media: { prefix: 'dms-media' } },
      }),
    ]
  : []

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— DMS Rennbahnklinik',
    },
    components: {},
  },
  collections: [
    Users,
    Documents,
    Media,
    AuditLogs,
    ReadConfirmations,
    ApprovalTasks,
    Notifications,
    DocumentCategories,
  ],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
    // Node.js 24 on macOS uses a bundled CA store that may not include
    // all intermediate CAs used by MongoDB Atlas. Allow invalid certs in
    // development only; production always enforces strict TLS.
    connectOptions: process.env.NODE_ENV !== 'production'
      ? { tlsAllowInvalidCertificates: true }
      : {},
  }),
  email: resendAdapter({
    defaultFromAddress: process.env.RESEND_FROM_ADDRESS || 'noreply@rennbahnklinik.ch',
    defaultFromName: process.env.RESEND_FROM_NAME || 'DMS Rennbahnklinik',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
  plugins,
  secret: process.env.PAYLOAD_SECRET || 'fallback-secret-change-in-production',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  i18n: {
    fallbackLanguage: 'de',
    supportedLanguages: { de, en, fr, it },
  },
  localization: {
    locales: [
      { label: 'Deutsch', code: 'de' },
      { label: 'English', code: 'en' },
      { label: 'Français', code: 'fr' },
      { label: 'Italiano', code: 'it' },
    ],
    defaultLocale: 'de',
    fallback: true,
  },
  sharp,
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'],
  csrf: [process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'],
})
