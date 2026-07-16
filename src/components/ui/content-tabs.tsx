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
    <div className="mb-4 flex gap-2">
      {tabs.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-swift',
            active === key
              ? 'border-teal-ink bg-teal-ink text-white'
              : 'border-mist bg-white text-pewter hover:text-charcoal'
          )}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  )
}
