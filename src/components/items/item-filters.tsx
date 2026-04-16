'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

interface Category {
  id: number
  name: string
}

interface Location {
  id: number
  name: string
}

interface ItemFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  categoryId: string
  onCategoryChange: (value: string) => void
  locationId: string
  onLocationChange: (value: string) => void
  lowStockOnly: boolean
  onLowStockChange: (value: boolean) => void
  categories: Category[]
  locations: Location[]
}

export function ItemFilters({
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  locationId,
  onLocationChange,
  lowStockOnly,
  onLowStockChange,
  categories,
  locations,
}: ItemFiltersProps) {
  const t = useTranslations('items')

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <select
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">{t('allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={locationId}
          onChange={(e) => onLocationChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">{t('allLocations')}</option>
          {locations.map((l) => (
            <option key={l.id} value={String(l.id)}>
              {l.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => onLowStockChange(!lowStockOnly)}
          className={cn(
            'flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
            lowStockOnly
              ? 'border-yellow-400 bg-yellow-100 text-yellow-800'
              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
          )}
        >
          {t('lowStockFilter')}
        </button>
      </div>
    </div>
  )
}
