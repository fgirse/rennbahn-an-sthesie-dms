'use client'

import { useTranslations } from 'next-intl'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Props {
  locale: string
}

const STATUS_COLORS = {
  entwurf: '#94a3b8',
  in_pruefung: '#f59e0b',
  freigegeben: '#16a34a',
  in_revision: '#ea580c',
  archiviert: '#6b7280',
}

interface ChartData {
  name: string
  value: number
  color: string
}

export function DocumentsByStatusChart({ locale: _locale }: Props) {
  const t = useTranslations('documents.statuses')

  // This component receives server-rendered data via props in a real app.
  // Showing placeholder data here — replace with actual counts from props.
  const data: ChartData[] = [
    { name: t('freigegeben'), value: 0, color: STATUS_COLORS.freigegeben },
    { name: t('entwurf'), value: 0, color: STATUS_COLORS.entwurf },
    { name: t('in_pruefung'), value: 0, color: STATUS_COLORS.in_pruefung },
    { name: t('in_revision'), value: 0, color: STATUS_COLORS.in_revision },
    { name: t('archiviert'), value: 0, color: STATUS_COLORS.archiviert },
  ]

  const tDash = useTranslations('dashboard')

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-[var(--color-foreground)]">{tDash('documentsByStatus')}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
