'use client'

import { useEffect, useState } from 'react'
import { BarChart2, AlertTriangle, Monitor, Package } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { ContentTabs } from '@/components/ui/content-tabs'
import { StockChart } from '@/components/reports/stock-chart'
import { StatCard } from '@/components/reports/stat-card'
import { AssetStats, type AssetSummaryData } from '@/components/reports/asset-stats'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

interface SummaryStats {
  totalItems: number
  totalValue: number
  lowStockCount: number
  activeCheckouts: number
}

interface MovementRow {
  date: string
  type: 'IN' | 'OUT' | 'ADJUST'
  total: number
}

interface LowStockItem {
  id: number
  name: string
  sku: string
  quantity: number
  minQuantity: number | null
}

interface CategoryBreakdown {
  categoryName: string
  count: number
  totalQuantity: string | number | null
}

interface ReportsData {
  summary: SummaryStats | null
  movements: MovementRow[]
  lowStock: LowStockItem[]
  categories: CategoryBreakdown[]
  assetSummary: AssetSummaryData | null
}

type ReportsTab = 'items' | 'assets'

export default function ReportsPage() {
  const t = useTranslations('reports')
  const tStats = useTranslations('reports.stats')
  const [tab, setTab] = useState<ReportsTab>('items')
  const [data, setData] = useState<ReportsData>({
    summary: null,
    movements: [],
    lowStock: [],
    categories: [],
    assetSummary: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadReports = async () => {
      try {
        const [summaryRes, movementsRes, lowStockRes, assetSummaryRes] = await Promise.all([
          apiFetch('/api/reports?type=summary'),
          apiFetch('/api/reports?type=movements'),
          apiFetch('/api/reports?type=low-stock'),
          apiFetch('/api/reports?type=asset-summary'),
        ])

        const [summaryJson, movementsJson, lowStockJson, assetSummaryJson] = await Promise.all([
          summaryRes.json(),
          movementsRes.json(),
          lowStockRes.json(),
          assetSummaryRes.json(),
        ])

        const rawMovements = movementsJson.success ? movementsJson.data?.movements ?? [] : []
        const movements: MovementRow[] = rawMovements.map((m: { createdAt: string; type: 'IN' | 'OUT' | 'ADJUST'; quantity: number }) => ({
          date: m.createdAt.slice(0, 10),
          type: m.type,
          total: Number(m.quantity) || 0,
        }))

        setData({
          summary: summaryJson.success ? summaryJson.data : null,
          movements,
          lowStock: lowStockJson.success ? lowStockJson.data ?? [] : [],
          categories: summaryJson.success ? summaryJson.data?.byCategory ?? [] : [],
          assetSummary: assetSummaryJson.success ? assetSummaryJson.data : null,
        })
      } catch (err) {
        console.error('Failed to load reports:', err)
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [])

  if (loading) return <Loading />

  const { summary, movements, lowStock, categories, assetSummary } = data

  const tabs = [
    { key: 'items' as const, icon: Package, label: t('tabItems') },
    { key: 'assets' as const, icon: Monitor, label: t('tabAssets') },
  ]

  return (
    <div className="px-4 py-4 space-y-6">
      <h1 className="text-lg font-bold text-charcoal">{t('title')}</h1>

      <ContentTabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'items' && summary && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={tStats('totalItems')} value={summary.totalItems} />
          <StatCard
            label={tStats('inventoryValue')}
            value={formatCurrency(summary.totalValue)}
          />
          <StatCard
            label={tStats('lowStock')}
            value={summary.lowStockCount}
            highlight={summary.lowStockCount > 0}
          />
          <StatCard label={tStats('checkedOut')} value={summary.activeCheckouts} />
        </div>
      )}

      {tab === 'items' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 size={18} />
              {t('stockMovements')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StockChart data={movements} />
          </CardContent>
        </Card>
      )}

      {tab === 'items' && lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle size={18} />
              {t('lowStockTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-mist">
              {lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-charcoal">{item.name}</p>
                    <p className="text-xs text-pewter/70">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="danger">{t('leftBadge', { count: item.quantity })}</Badge>
                    {item.minQuantity !== null && (
                      <p className="mt-0.5 text-xs text-pewter/70">
                        {t('minLabel', { min: item.minQuantity })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'items' && categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('byCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-mist">
              {categories.map((cat) => (
                <div key={cat.categoryName} className="flex items-center justify-between py-2.5">
                  <p className="text-sm font-medium text-charcoal">
                    {cat.categoryName ?? t('uncategorized')}
                  </p>
                  <div className="text-right">
                    <p className="text-sm text-charcoal">{t('itemsCount', { count: cat.count })}</p>
                    <p className="text-xs text-pewter/70">
                      {t('totalQty', { qty: Number(cat.totalQuantity) || 0 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'assets' && assetSummary && <AssetStats data={assetSummary} />}
    </div>
  )
}
