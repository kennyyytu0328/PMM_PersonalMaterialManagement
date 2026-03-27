import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

type StatColor = 'blue' | 'yellow' | 'green' | 'purple'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  color: StatColor
}

const colorMap: Record<StatColor, { bg: string; text: string; iconBg: string }> = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    iconBg: 'bg-blue-100',
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    iconBg: 'bg-yellow-100',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    iconBg: 'bg-green-100',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    iconBg: 'bg-purple-100',
  },
}

export function StatCard({ label, value, icon, color }: StatCardProps) {
  const colors = colorMap[color]

  return (
    <div className={cn('rounded-xl p-4 shadow-sm', colors.bg)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={cn('mt-1 text-2xl font-bold', colors.text)}>{value}</p>
        </div>
        <div className={cn('rounded-lg p-2', colors.iconBg, colors.text)}>
          {icon}
        </div>
      </div>
    </div>
  )
}
