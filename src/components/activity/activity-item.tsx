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
  { icon: React.ReactNode; color: string; label: string; prefix: string }
> = {
  IN: {
    icon: <ArrowDown size={16} />,
    color: 'text-green-600 bg-green-100',
    label: 'Stock In',
    prefix: '+',
  },
  OUT: {
    icon: <ArrowUp size={16} />,
    color: 'text-red-600 bg-red-100',
    label: 'Stock Out',
    prefix: '-',
  },
  ADJUST: {
    icon: <Settings size={16} />,
    color: 'text-yellow-600 bg-yellow-100',
    label: 'Adjust',
    prefix: '',
  },
  CHECKOUT: {
    icon: <ArrowUpRight size={16} />,
    color: 'text-blue-600 bg-blue-100',
    label: 'Checkout',
    prefix: '-',
  },
  RETURN: {
    icon: <RotateCcw size={16} />,
    color: 'text-purple-600 bg-purple-100',
    label: 'Return',
    prefix: '+',
  },
}

export function ActivityItem({ itemName, type, quantity, timestamp, performedBy }: ActivityItemProps) {
  const config = typeConfig[type]

  return (
    <div className="flex items-center gap-3 py-2">
      <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', config.color)}>
        {config.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{itemName}</p>
        <p className="text-xs text-gray-500">
          {config.label}
          {performedBy ? ` · ${performedBy}` : ''}
          {' · '}
          {formatDate(timestamp)}
        </p>
      </div>
      <span
        className={cn(
          'text-sm font-semibold',
          type === 'IN' || type === 'RETURN' ? 'text-green-600' : 'text-red-600',
          type === 'ADJUST' && 'text-yellow-600'
        )}
      >
        {config.prefix}{quantity}
      </span>
    </div>
  )
}
