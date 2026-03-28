'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Tag, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/locations', label: 'Locations', icon: MapPin },
]

export function AdminTabs() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 border-b border-gray-200 px-4 pt-3 pb-0">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
