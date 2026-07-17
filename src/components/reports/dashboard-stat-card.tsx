import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

type StatSurface = 'sky' | 'sage' | 'aqua' | 'ash'

interface DashboardStatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  color: StatSurface
}

const surfaceMap: Record<StatSurface, string> = {
  sky: 'bg-sky-card',
  sage: 'bg-sage-card',
  aqua: 'bg-aqua-card',
  ash: 'bg-ash-card',
}

export function DashboardStatCard({ label, value, icon, color }: DashboardStatCardProps) {
  return (
    <div className={cn('h-full rounded-[20px] p-4', surfaceMap[color])}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-charcoal/70">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-navy tabular-nums">
            {value}
          </p>
        </div>
        <div className="shrink-0 rounded-full bg-white/60 p-2 text-teal-ink">{icon}</div>
      </div>
    </div>
  )
}
