'use client'

import { useSession, signOut } from 'next-auth/react'
import { Search, User, LogOut, Settings, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from './language-switcher'

export function Header() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const t = useTranslations('header')

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-bold text-gray-900">
          {t('appName')}
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/items?search=true"
            className="text-gray-500 hover:text-gray-700"
            aria-label={t('search')}
          >
            <Search size={20} />
          </Link>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gray-500 hover:text-gray-700"
              aria-label={t('userMenu')}
            >
              <User size={20} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-gray-100 px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                    <p className="text-xs text-gray-500">{(session?.user as any)?.role}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <KeyRound size={16} />
                    {t('changePassword')}
                  </Link>
                  {(session?.user as any)?.role === 'admin' && (
                    <Link
                      href="/admin/users"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings size={16} />
                      {t('adminSettings')}
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
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
