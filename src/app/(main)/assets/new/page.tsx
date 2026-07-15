import { getTranslations } from 'next-intl/server'
import { AssetForm } from '@/components/assets/asset-form'

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ serialNo?: string }>
}) {
  const t = await getTranslations('assetForm')
  const { serialNo } = await searchParams

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('createTitle')}</h1>
      <AssetForm initialData={serialNo ? { serialNo } : undefined} />
    </div>
  )
}
