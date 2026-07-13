'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ContentTab<K extends string> {
  key: K
  icon: LucideIcon
  label: string
}

export function ContentTabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: ContentTab<K>[]
  active: K
  onChange: (key: K) => void
}) {
  return (
    <div className="mb-4 flex gap-1 border-b border-gray-200">
      {tabs.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition-colors',
            active === key
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  )
}
