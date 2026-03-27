'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Package, Camera, ArrowLeftRight, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/items', label: 'Items', icon: Package },
  { href: '/scan', label: 'Scan', icon: Camera },
  { href: '/activity', label: 'Activity', icon: ArrowLeftRight },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-safe">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const isScan = item.href === '/scan'

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center py-2 px-3',
                isScan ? 'relative -top-3' : '',
                isActive ? 'text-blue-600' : 'text-gray-400'
              )}
            >
              {isScan ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                  <item.icon size={24} />
                </div>
              ) : (
                <item.icon size={22} />
              )}
              <span className={cn('text-[10px] mt-1', isScan && 'text-blue-600')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
