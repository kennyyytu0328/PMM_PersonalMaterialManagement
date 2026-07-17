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
      className="flex items-center gap-3 rounded-[20px] border border-mist bg-white p-4 transition-colors duration-150 ease-swift hover:border-teal hover:bg-aqua-card/30 active:bg-aqua-card"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ash-card text-pewter/70">
        <Package size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-charcoal">{name}</p>
          {isLowStock && (
            <Badge variant="warning" className="flex-shrink-0">
              {t('lowBadge')}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-pewter/70">
          {t('skuLabel')}: {sku}
          {categoryName ? ` · ${categoryName}` : ''}
          {locationName ? ` · ${locationName}` : ''}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-semibold text-charcoal tabular-nums">
          {quantity}
        </p>
        <p className="text-xs text-pewter/70">{unit}</p>
      </div>
    </Link>
  )
}
