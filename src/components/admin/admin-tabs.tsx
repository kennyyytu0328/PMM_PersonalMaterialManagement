'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Users, Tag, MapPin, Contact, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/admin/users', key: 'users', icon: Users },
  { href: '/admin/categories', key: 'categories', icon: Tag },
  { href: '/admin/locations', key: 'locations', icon: MapPin },
  { href: '/admin/people', key: 'people', icon: Contact },
  { href: '/admin/scrap-approvals', key: 'scrapApprovals', icon: ClipboardCheck },
] as const

export function AdminTabs() {
  const pathname = usePathname()
  const t = useTranslations('admin.tabs')

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-mist px-4 pt-3 pb-3">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-swift',
              isActive
                ? 'border-teal-ink bg-teal-ink text-white'
                : 'border-mist bg-white text-pewter hover:text-charcoal'
            )}
          >
            <tab.icon size={16} />
            {t(tab.key)}
          </Link>
        )
      })}
    </div>
  )
}
