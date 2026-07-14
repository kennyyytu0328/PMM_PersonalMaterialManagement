import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

type StatColor = 'blue' | 'yellow' | 'green' | 'purple'

interface DashboardStatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  color: StatColor
}

const iconColorMap: Record<StatColor, string> = {
  blue: 'bg-blue-50 text-blue-600',
  yellow: 'bg-amber-50 text-amber-600',
  green: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-purple-50 text-purple-600',
}

export function DashboardStatCard({ label, value, icon, color }: DashboardStatCardProps) {
  return (
    <div className="h-full rounded-xl border border-gray-200 bg-white p-4 transition-colors duration-150 ease-swift hover:border-gray-300">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 tabular-nums">
            {value}
          </p>
        </div>
        <div className={cn('shrink-0 rounded-lg p-2', iconColorMap[color])}>{icon}</div>
      </div>
    </div>
  )
}
