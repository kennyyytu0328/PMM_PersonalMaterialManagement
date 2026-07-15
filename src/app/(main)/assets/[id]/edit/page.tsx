'use client'

import { useEffect, useState, use } from 'react'
import { useTranslations } from 'next-intl'
import { AssetForm, AssetFormData } from '@/components/assets/asset-form'
import { Loading } from '@/components/ui/loading'
import { apiFetch } from '@/lib/api'

export default function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('assetForm')
  const [initialData, setInitialData] = useState<Partial<AssetFormData> | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchAsset() {
      try {
        const res = await apiFetch(`/api/assets/${id}`)
        const json = await res.json()
        if (!json.success) {
          setNotFound(true)
          return
        }
        const a = json.data
        setInitialData({
          name: a.name,
          assetNo: a.assetNo,
          description: a.description ?? '',
          categoryId: a.categoryId ? String(a.categoryId) : '',
          locationId: a.locationId ? String(a.locationId) : '',
          custodianId: a.custodianId ? String(a.custodianId) : '',
          acquiredAt: a.acquiredAt ?? '',
          cost: a.cost != null ? String(a.cost) : '',
          vendor: a.vendor ?? '',
          barcode: a.barcode ?? '',
          serialNo: a.serialNo ?? '',
        })
      } catch {
        setNotFound(true)
      }
    }
    fetchAsset()
  }, [id])

  if (notFound) {
    return <p className="py-10 text-center text-sm text-gray-500">{t('saveFailed')}</p>
  }

  if (!initialData) {
    return <Loading />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('editTitle')}</h1>
      <AssetForm assetId={parseInt(id)} initialData={initialData} />
    </div>
  )
}
