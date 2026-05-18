import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Resend } from 'resend'
import { getValidityExpiringEmail } from '@/lib/email/templates'

export const maxDuration = 300

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })
  const resend = new Resend(process.env.RESEND_API_KEY)
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const warningDays = [30, 14, 7]
  let notificationsSent = 0

  try {
    for (const days of warningDays) {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + days)
      const targetDateStr = targetDate.toISOString().split('T')[0]

      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)
      const nextDayStr = nextDay.toISOString().split('T')[0]

      const expiringDocs = await payload.find({
        collection: 'documents',
        where: {
          and: [
            { validUntil: { greater_than_equal: `${targetDateStr}T00:00:00.000Z` } },
            { validUntil: { less_than: `${nextDayStr}T00:00:00.000Z` } },
            { status: { equals: 'freigegeben' } },
          ],
        },
        depth: 1,
        limit: 100,
      })

      for (const doc of expiringDocs.docs) {
        const owner = typeof doc.owner === 'object' ? doc.owner : null
        if (!owner || !owner.email) continue

        const lang = (owner.preferredLanguage as 'de' | 'en' | 'fr' | 'it') || 'de'
        const email = getValidityExpiringEmail({
          title: String(doc.title),
          date: new Date(String(doc.validUntil)).toLocaleDateString(lang === 'de' ? 'de-CH' : lang),
          documentUrl: `${serverUrl}/${lang}/dokumente/${doc.id}`,
          lang,
        })

        await resend.emails.send({
          from: `${process.env.RESEND_FROM_NAME || 'DMS Rennbahnklinik'} <${process.env.RESEND_FROM_ADDRESS || 'noreply@rennbahnklinik.ch'}>`,
          to: owner.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        })

        // Create in-app notification
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: typeof doc.owner === 'object' ? doc.owner.id : doc.owner,
            type: 'validity_expiring',
            message: `Dokument "${doc.title}" läuft in ${days} Tagen ab.`,
            documentId: String(doc.id),
            link: `/dokumente/${doc.id}`,
          },
        })

        notificationsSent++
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[Cron] Expiry check failed:', err)
    return NextResponse.json({ error: 'Cron job failed', details: String(err) }, { status: 500 })
  }
}
