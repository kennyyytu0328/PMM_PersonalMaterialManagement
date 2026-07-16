'use client'

import { useSession, signOut } from 'next-auth/react'
import { Search, User, LogOut, Settings, KeyRound } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from './language-switcher'

export function Header() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const t = useTranslations('header')

  return (
    <header className="sticky top-0 z-30 bg-teal-ink">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" aria-label={t('appName')} className="flex items-center">
          <Image
            src="/gogo_fresh_transparent.png"
            alt={t('appName')}
            width={120}
            height={53}
            priority
            className="h-9 w-auto"
          />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/items?search=true"
            className="text-white/70 transition-colors duration-150 ease-swift hover:text-white"
            aria-label={t('search')}
          >
            <Search size={20} />
          </Link>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-white/70 transition-colors duration-150 ease-swift hover:text-white"
              aria-label={t('userMenu')}
            >
              <User size={20} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
                <div className="animate-surface-in absolute right-0 top-8 w-48 rounded-[20px] border border-mist bg-white py-1">
                  <div className="border-b border-ash-card px-3 py-2">
                    <p className="text-sm font-medium text-charcoal">{session?.user?.name}</p>
                    <p className="text-xs text-pewter">{(session?.user as any)?.role}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-charcoal hover:bg-ash-card"
                    onClick={() => setMenuOpen(false)}
                  >
                    <KeyRound size={16} />
                    {t('changePassword')}
                  </Link>
                  {(session?.user as any)?.role === 'admin' && (
                    <Link
                      href="/admin/users"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-charcoal hover:bg-ash-card"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings size={16} />
                      {t('adminSettings')}
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-ash-card"
                  >
                    <LogOut size={16} />
                    {t('signOut')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
