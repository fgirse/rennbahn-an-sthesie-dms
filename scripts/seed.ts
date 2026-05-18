/**
 * Seed script — creates the initial system-admin user.
 * Run with:  yarn seed
 *
 * Reads SEED_EMAIL / SEED_PASSWORD from environment (or .env.local).
 * Falls back to admin@rennbahnklinik.ch / Change_me_123! if unset.
 * Env vars are injected via --env-file so they are available before any import.
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

const EMAIL = process.env.SEED_EMAIL ?? 'admin@rennbahnklinik.ch'
const PASSWORD = process.env.SEED_PASSWORD ?? 'Change_me_123!'

async function seed() {
  const payload = await getPayload({ config })

  // Check if a system-admin already exists
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: EMAIL } },
    limit: 1,
  })

  if (existing.totalDocs > 0) {
    console.log(`ℹ  User ${EMAIL} already exists — skipping creation.`)
    process.exit(0)
  }

  await payload.create({
    collection: 'users',
    data: {
      firstName: 'System',
      lastName: 'Admin',
      email: EMAIL,
      password: PASSWORD,
      role: 'systemadmin',
      isActive: true,
    },
  })

  console.log(`✓  Admin user created: ${EMAIL}`)
  console.log(`   Password: ${PASSWORD}`)
  console.log(`   ⚠  Change the password after first login!`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
