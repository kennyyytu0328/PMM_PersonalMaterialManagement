'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ItemForm } from '@/components/items/item-form'

export default function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>
}) {
  const params = use(searchParams)
  const barcode = params.barcode

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <Link href="/items">
          <button className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">New Item</h1>
      </div>

      <ItemForm defaultBarcode={barcode} />
    </div>
  )
}
