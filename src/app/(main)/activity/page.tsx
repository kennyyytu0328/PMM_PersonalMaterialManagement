'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

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

interface ApiResponse {
  success: boolean
  data: TransactionItem[]
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
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <Badge variant={TYPE_VARIANT[tx.type]} className="mt-0.5 shrink-0">
        {tTypes(tx.type)}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {tx.item?.name ?? t('unknownItem')}
        </p>
        <p className="text-xs text-gray-400">{tx.item?.sku}</p>
        {tx.note && <p className="mt-0.5 text-xs text-gray-500">{tx.note}</p>}
        <p className="mt-1 text-xs text-gray-400">
          {t('by')} {tx.performer?.name ?? t('unknownPerformer')} · {formatDate(tx.createdAt)}
        </p>
      </div>
      <span
        className={
          tx.type === 'IN'
            ? 'text-sm font-semibold text-green-600'
            : tx.type === 'OUT'
              ? 'text-sm font-semibold text-red-600'
              : 'text-sm font-semibold text-blue-600'
        }
      >
        {tx.type === 'IN' ? '+' : tx.type === 'OUT' ? '-' : '±'}
        {tx.quantity}
      </span>
    </div>
  )
}

export default function ActivityPage() {
  const t = useTranslations('activity')
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    try {
      const res = await fetch(`/api/transactions?page=${pageNum}&limit=50`)
      const json: ApiResponse = await res.json()
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

  useEffect(() => {
    setLoading(true)
    fetchPage(1, false).finally(() => setLoading(false))
  }, [fetchPage])

  const handleLoadMore = async () => {
    const nextPage = page + 1
    setLoadingMore(true)
    await fetchPage(nextPage, true)
    setPage(nextPage)
    setLoadingMore(false)
  }

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-bold text-gray-900">{t('title')}</h1>

      {loading ? (
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
      )}
    </div>
  )
}
