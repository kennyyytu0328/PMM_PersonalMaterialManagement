'use client'

import { useTranslations } from 'next-intl'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AssetStatusBadge } from '@/components/assets/asset-status-badge'
import { StatCard } from '@/components/reports/stat-card'
import { formatCurrency } from '@/lib/utils'

export interface AssetSummaryData {
  totalAssets: number
  totalValue: number
  activeValue: number
  inUse: number
  pendingScrap: number
  byStatus: Array<{ status: string; count: number }>
}

const ALL_STATUSES = ['idle', 'in_use', 'repair', 'lent_out', 'lost', 'scrapped'] as const

export function AssetStats({ data }: { data: AssetSummaryData }) {
  const t = useTranslations('reports')
  const tStats = useTranslations('reports.stats')

  const countByStatus = Object.fromEntries(data.byStatus.map((row) => [row.status, row.count]))
  const rows = ALL_STATUSES.map((status) => ({ status, count: countByStatus[status] ?? 0 }))
  const maxCount = Math.max(1, ...rows.map((row) => row.count))

  return (
    <>
      <h2 className="text-base font-semibold text-gray-900">{t('assetsTitle')}</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={tStats('totalAssets')} value={data.totalAssets} />
        <StatCard
          label={tStats('assetValue')}
          value={formatCurrency(data.activeValue)}
          sub={tStats('assetValueSub', { total: formatCurrency(data.totalValue) })}
        />
        <StatCard label={tStats('assetsInUse')} value={data.inUse} />
        <StatCard
          label={tStats('pendingScrap')}
          value={data.pendingScrap}
          highlight={data.pendingScrap > 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('byStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <div key={row.status} className="flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <AssetStatusBadge status={row.status} />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${(row.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium text-gray-700">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
