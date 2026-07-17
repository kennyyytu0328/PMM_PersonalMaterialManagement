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
          className="absolute left-3 top-1/2 -translate-y-1/2 text-pewter/70"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="block w-full rounded-full border border-mist py-2 pl-9 pr-3 text-sm placeholder:text-pewter/70 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <select
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-full border border-mist px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
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
          className="rounded-full border border-mist px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
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
            'flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-swift',
            lowStockOnly
              ? 'border-teal-ink bg-teal-ink text-white'
              : 'border-mist bg-white text-pewter hover:text-charcoal'
          )}
        >
          {t('lowStockFilter')}
        </button>
      </div>
    </div>
  )
}
