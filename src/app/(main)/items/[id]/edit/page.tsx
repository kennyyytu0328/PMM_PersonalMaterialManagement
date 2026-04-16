'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { ItemForm } from '@/components/items/item-form'
import { Loading } from '@/components/ui/loading'

interface ItemData {
  id: number
  name: string
  description: string | null
  barcode: string | null
  categoryId: number | null
  locationId: number | null
  quantity: number
  minQuantity: number | null
  unit: string
  unitCost: number | null
}

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const t = useTranslations('items')
  const [item, setItem] = useState<ItemData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchItem() {
      try {
        const res = await fetch(`/api/items/${id}`)
        const json = await res.json()

        if (!json.success) {
          router.push('/items')
          return
        }

        setItem(json.data)
      } catch {
        router.push('/items')
      } finally {
        setLoading(false)
      }
    }
    fetchItem()
  }, [id])

  if (loading) return <Loading text={t('loadingItem')} />
  if (!item) return null

  const initialData = {
    name: item.name,
    description: item.description ?? '',
    barcode: item.barcode ?? '',
    categoryId: item.categoryId ? String(item.categoryId) : '',
    locationId: item.locationId ? String(item.locationId) : '',
    quantity: String(item.quantity),
    minQuantity: item.minQuantity ? String(item.minQuantity) : '',
    unit: item.unit,
    unitCost: item.unitCost ? String(item.unitCost) : '',
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <Link href={`/items/${id}`}>
          <button className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{t('editItemTitle')}</h1>
      </div>

      <ItemForm itemId={item.id} initialData={initialData} />
    </div>
  )
}
