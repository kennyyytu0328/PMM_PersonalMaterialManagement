'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Package,
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  Briefcase,
  UserCheck,
  ClipboardCheck,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { StatCard } from '@/components/reports/stat-card'
import { ActivityItem } from '@/components/activity/activity-item'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

interface SummaryData {
  totalItems: number
  totalValue: number
  lowStockCount: number
  activeCheckouts: number
}

interface AssetSummary {
  totalAssets: number
  assetsInUse: number
  pendingScrap: number
}

interface Transaction {
  id: number
  type: 'IN' | 'OUT' | 'ADJUST'
  quantity: number
  createdAt: string
  item: { name: string } | null
  performer: { name: string } | null
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [assetSummary, setAssetSummary] = useState<AssetSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, txRes, assetsRes, inUseRes, scrapRes] = await Promise.all([
          apiFetch('/api/reports?type=summary'),
          apiFetch('/api/transactions?limit=10'),
          apiFetch('/api/assets?limit=1'),
          apiFetch('/api/assets?status=in_use&limit=1'),
          apiFetch('/api/scrap-requests?status=pending&limit=1'),
        ])

        const summaryJson = await summaryRes.json()
        const txJson = await txRes.json()
        const assetsJson = await assetsRes.json()
        const inUseJson = await inUseRes.json()
        const scrapJson = await scrapRes.json()

        if (summaryJson.success) {
          setSummary(summaryJson.data)
        }

        if (txJson.success) {
          setTransactions(txJson.data)
        }

        if (assetsJson.success && inUseJson.success && scrapJson.success) {
          setAssetSummary({
            totalAssets: assetsJson.meta.total,
            assetsInUse: inUseJson.meta.total,
            pendingScrap: scrapJson.meta.total,
          })
        }
      } catch {
        // silently fail — UI shows empty state
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <Loading text={t('loading')} />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t('stats.totalItems')}
          value={summary?.totalItems ?? 0}
          icon={<Package size={20} />}
          color="blue"
        />
        <StatCard
          label={t('stats.lowStock')}
          value={summary?.lowStockCount ?? 0}
          icon={<AlertTriangle size={20} />}
          color="yellow"
        />
        <StatCard
          label={t('stats.checkedOut')}
          value={summary?.activeCheckouts ?? 0}
          icon={<ArrowUpRight size={20} />}
          color="purple"
        />
        <StatCard
          label={t('stats.inventoryValue')}
          value={formatCurrency(summary?.totalValue ?? 0)}
          icon={<DollarSign size={20} />}
          color="green"
        />
      </div>

      {assetSummary && (
        <div className="grid grid-cols-3 gap-3">
          <Link href="/assets">
            <StatCard
              label={t('stats.totalAssets')}
              value={assetSummary.totalAssets}
              icon={<Briefcase size={20} />}
              color="blue"
            />
          </Link>
          <Link href="/assets?status=in_use">
            <StatCard
              label={t('stats.assetsInUse')}
              value={assetSummary.assetsInUse}
              icon={<UserCheck size={20} />}
              color="green"
            />
          </Link>
          <Link href="/admin/scrap-approvals">
            <StatCard
              label={t('stats.pendingScrap')}
              value={assetSummary.pendingScrap}
              icon={<ClipboardCheck size={20} />}
              color="yellow"
            />
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">{t('noActivity')}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <ActivityItem
                  key={tx.id}
                  itemName={tx.item?.name ?? t('unknownItem')}
                  type={tx.type}
                  quantity={tx.quantity}
                  timestamp={tx.createdAt}
                  performedBy={tx.performer?.name}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
