'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, Monitor, Package } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { ContentTabs } from '@/components/ui/content-tabs'
import { formatDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { AssetEventRow, type AssetEventEntry } from '@/components/activity/asset-event-row'

interface TransactionItem {
  id: number
  type: 'IN' | 'OUT' | 'ADJUST'
  quantity: number
  note: string | null
  createdAt: string
  item?: {
    id: number
    name: string
    sku: string
  }
  performer?: {
    id: number
    name: string
  }
}

interface ListResponse<T> {
  success: boolean
  data: T[]
  meta?: {
    total: number
    page: number
    limit: number
  }
}

const TYPE_VARIANT: Record<string, 'success' | 'danger' | 'info'> = {
  IN: 'success',
  OUT: 'danger',
  ADJUST: 'info',
}

function TransactionRow({ tx }: { tx: TransactionItem }) {
  const t = useTranslations('activity')
  const tTypes = useTranslations('activity.types')

  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-mist bg-white p-4">
      <Badge variant={TYPE_VARIANT[tx.type]} className="mt-0.5 shrink-0">
        {tTypes(tx.type)}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">
          {tx.item?.name ?? t('unknownItem')}
        </p>
        <p className="text-xs text-pewter/70">{tx.item?.sku}</p>
        {tx.note && <p className="mt-0.5 text-xs text-pewter">{tx.note}</p>}
        <p className="mt-1 text-xs text-pewter/70">
          {t('by')} {tx.performer?.name ?? t('unknownPerformer')} · {formatDate(tx.createdAt)}
        </p>
      </div>
      <span
        className={
          tx.type === 'IN'
            ? 'text-sm font-semibold text-teal'
            : tx.type === 'OUT'
              ? 'text-sm font-semibold text-red-600'
              : 'text-sm font-semibold text-teal'
        }
      >
        {tx.type === 'IN' ? '+' : tx.type === 'OUT' ? '-' : '±'}
        {tx.quantity}
      </span>
    </div>
  )
}

type ActivityTab = 'items' | 'assets'

export default function ActivityPage() {
  const t = useTranslations('activity')
  const [tab, setTab] = useState<ActivityTab>('items')

  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [assetEvents, setAssetEvents] = useState<AssetEventEntry[]>([])
  const [assetPage, setAssetPage] = useState(1)
  const [assetHasMore, setAssetHasMore] = useState(false)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetLoadingMore, setAssetLoadingMore] = useState(false)
  const [assetLoaded, setAssetLoaded] = useState(false)

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    try {
      const res = await apiFetch(`/api/transactions?page=${pageNum}&limit=50`)
      const json: ListResponse<TransactionItem> = await res.json()
      if (json.success) {
        setTransactions((prev) => (append ? [...prev, ...json.data] : json.data))
        const meta = json.meta
        if (meta) {
          setHasMore(meta.page * meta.limit < meta.total)
        }
      }
    } catch (err) {
      console.error('Failed to load transactions:', err)
    }
  }, [])

  const fetchAssetPage = useCallback(async (pageNum: number, append: boolean) => {
    try {
      const res = await apiFetch(`/api/asset-events?page=${pageNum}&limit=50`)
      const json: ListResponse<AssetEventEntry> = await res.json()
      if (json.success) {
        setAssetEvents((prev) => (append ? [...prev, ...json.data] : json.data))
        const meta = json.meta
        if (meta) {
          setAssetHasMore(meta.page * meta.limit < meta.total)
        }
      }
    } catch (err) {
      console.error('Failed to load asset events:', err)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchPage(1, false).finally(() => setLoading(false))
  }, [fetchPage])

  const handleTabChange = (nextTab: ActivityTab) => {
    setTab(nextTab)
    if (nextTab !== 'assets' || assetLoaded) return
    setAssetLoaded(true)
    setAssetLoading(true)
    fetchAssetPage(1, false).finally(() => setAssetLoading(false))
  }

  const handleLoadMore = async () => {
    const nextPage = page + 1
    setLoadingMore(true)
    await fetchPage(nextPage, true)
    setPage(nextPage)
    setLoadingMore(false)
  }

  const handleAssetLoadMore = async () => {
    const nextPage = assetPage + 1
    setAssetLoadingMore(true)
    await fetchAssetPage(nextPage, true)
    setAssetPage(nextPage)
    setAssetLoadingMore(false)
  }

  const tabs = [
    { key: 'items' as const, icon: Package, label: t('tabItems') },
    { key: 'assets' as const, icon: Monitor, label: t('tabAssets') },
  ]

  return (
    <div className="px-4 py-4">
      <h1 className="mb-3 text-lg font-bold text-charcoal">{t('title')}</h1>

      <ContentTabs tabs={tabs} active={tab} onChange={handleTabChange} />

      {tab === 'items' ? (
        loading ? (
          <Loading />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<Activity size={40} />}
            title={t('noTransactions')}
            description={t('noTransactionsDesc')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}

            {hasMore && (
              <Button
                variant="secondary"
                className="mt-2 w-full"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? t('loadingMore') : t('loadMore')}
              </Button>
            )}
          </div>
        )
      ) : assetLoading ? (
        <Loading />
      ) : assetEvents.length === 0 ? (
        <EmptyState
          icon={<Monitor size={40} />}
          title={t('noAssetEvents')}
          description={t('noAssetEventsDesc')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {assetEvents.map((event) => (
            <AssetEventRow key={event.id} event={event} />
          ))}

          {assetHasMore && (
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={handleAssetLoadMore}
              disabled={assetLoadingMore}
            >
              {assetLoadingMore ? t('loadingMore') : t('loadMore')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
