'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Plus, Package } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ItemCard } from '@/components/items/item-card'
import { ItemFilters } from '@/components/items/item-filters'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'

interface Category {
  id: number
  name: string
}

interface Location {
  id: number
  name: string
}

interface Item {
  id: number
  name: string
  sku: string
  quantity: number
  minQuantity: number | null
  unit: string
  category: { name: string } | null
  location: { name: string } | null
}

export default function ItemsPage() {
  const t = useTranslations('items')
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function fetchFilters() {
      try {
        const [catRes, locRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/locations'),
        ])
        const catJson = await catRes.json()
        const locJson = await locRes.json()
        if (catJson.success) setCategories(catJson.data)
        if (locJson.success) setLocations(locJson.data)
      } catch {
        // fail silently
      }
    }
    fetchFilters()
  }, [])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchItems()
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [search, categoryId, locationId, lowStockOnly])

  async function fetchItems() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryId) params.set('categoryId', categoryId)
      if (locationId) params.set('locationId', locationId)
      params.set('limit', '50')

      const res = await fetch(`/api/items?${params}`)
      const json = await res.json()

      if (json.success) {
        const data = lowStockOnly
          ? json.data.filter(
              (item: Item) => item.minQuantity != null && item.quantity <= item.minQuantity
            )
          : json.data
        setItems(data)
        setTotal(json.meta.total)
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{t('totalCount', { count: total })}</p>
        </div>
        <Link href="/items/new">
          <Button size="sm">
            <Plus size={16} className="mr-1" />
            {t('add')}
          </Button>
        </Link>
      </div>

      <ItemFilters
        search={search}
        onSearchChange={setSearch}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        locationId={locationId}
        onLocationChange={setLocationId}
        lowStockOnly={lowStockOnly}
        onLowStockChange={setLowStockOnly}
        categories={categories}
        locations={locations}
      />

      {loading ? (
        <Loading text={t('loading')} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package size={40} />}
          title={t('noItemsTitle')}
          description={search ? t('noItemsSearchHint') : t('noItemsEmptyHint')}
          action={
            !search ? (
              <Link href="/items/new">
                <Button size="sm">
                  <Plus size={16} className="mr-1" />
                  {t('addItem')}
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              id={item.id}
              name={item.name}
              sku={item.sku}
              quantity={item.quantity}
              minQuantity={item.minQuantity}
              unit={item.unit}
              categoryName={item.category?.name}
              locationName={item.location?.name}
            />
          ))}
        </div>
      )}
    </div>
  )
}
