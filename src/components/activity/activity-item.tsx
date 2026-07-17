'use client'

import { useTranslations } from 'next-intl'
import { cn, formatDate } from '@/lib/utils'
import { ArrowDown, ArrowUp, Settings, ArrowUpRight, RotateCcw } from 'lucide-react'

type TransactionType = 'IN' | 'OUT' | 'ADJUST' | 'CHECKOUT' | 'RETURN'

interface ActivityItemProps {
  itemName: string
  type: TransactionType
  quantity: number
  timestamp: string
  performedBy?: string
}

const typeConfig: Record<
  TransactionType,
  { icon: React.ReactNode; color: string; prefix: string }
> = {
  IN: {
    icon: <ArrowDown size={16} />,
    color: 'text-teal bg-aqua-card',
    prefix: '+',
  },
  OUT: {
    icon: <ArrowUp size={16} />,
    color: 'text-amber-700 bg-peach-card',
    prefix: '-',
  },
  ADJUST: {
    icon: <Settings size={16} />,
    color: 'text-[#4a91b3] bg-sky-card',
    prefix: '',
  },
  CHECKOUT: {
    icon: <ArrowUpRight size={16} />,
    color: 'text-navy bg-sky-card',
    prefix: '-',
  },
  RETURN: {
    icon: <RotateCcw size={16} />,
    color: 'text-teal-ink bg-sage-card',
    prefix: '+',
  },
}

export function ActivityItem({ itemName, type, quantity, timestamp, performedBy }: ActivityItemProps) {
  const t = useTranslations('activity.types')
  const config = typeConfig[type]

  return (
    <div className="flex items-center gap-3 py-2">
      <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', config.color)}>
        {config.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{itemName}</p>
        <p className="text-xs text-pewter">
          {t(type)}
          {performedBy ? ` · ${performedBy}` : ''}
          {' · '}
          {formatDate(timestamp)}
        </p>
      </div>
      <span
        className={cn(
          'text-sm font-semibold',
          type === 'IN' || type === 'RETURN' ? 'text-teal' : 'text-amber-700',
          type === 'ADJUST' && 'text-pewter'
        )}
      >
        {config.prefix}{quantity}
      </span>
    </div>
  )
}
