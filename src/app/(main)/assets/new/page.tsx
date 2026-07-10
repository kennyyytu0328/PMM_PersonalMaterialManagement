'use client'

import { useTranslations } from 'next-intl'
import { AssetForm } from '@/components/assets/asset-form'

export default function NewAssetPage() {
  const t = useTranslations('assetForm')

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('createTitle')}</h1>
      <AssetForm />
    </div>
  )
}
