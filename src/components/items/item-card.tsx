'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Package } from 'lucide-react'

interface ItemCardProps {
  id: number
  name: string
  sku: string
  quantity: number
  minQuantity: number | null
  unit: string
  categoryName?: string | null
  locationName?: string | null
}

export function ItemCard({
  id,
  name,
  sku,
  quantity,
  minQuantity,
  unit,
  categoryName,
  locationName,
}: ItemCardProps) {
  const t = useTranslations('items')
  const isLowStock = minQuantity != null && quantity <= minQuantity

  return (
    <Link
      href={`/items/${id}`}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/30 active:bg-blue-50"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <Package size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-gray-900">{name}</p>
          {isLowStock && (
            <Badge variant="warning" className="flex-shrink-0">
              {t('lowBadge')}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          {t('skuLabel')}: {sku}
          {categoryName ? ` · ${categoryName}` : ''}
          {locationName ? ` · ${locationName}` : ''}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-semibold text-gray-900">
          {quantity}
        </p>
        <p className="text-xs text-gray-400">{unit}</p>
      </div>
    </Link>
  )
}
