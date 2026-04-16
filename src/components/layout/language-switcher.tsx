'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { Languages } from 'lucide-react'
import { locales, localeLabels, type Locale } from '@/i18n/config'
import { setLocale } from '@/lib/locale-actions'

export function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale
  const t = useTranslations('header')
  const [isPending, startTransition] = useTransition()

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as Locale
    if (next === currentLocale) return
    startTransition(() => {
      setLocale(next)
    })
  }

  return (
    <label className="flex items-center gap-1 text-gray-500" aria-label={t('language')}>
      <Languages size={18} />
      <select
        value={currentLocale}
        onChange={handleChange}
        disabled={isPending}
        className="bg-transparent text-sm outline-none disabled:opacity-50"
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeLabels[locale]}
          </option>
        ))}
      </select>
    </label>
  )
}
