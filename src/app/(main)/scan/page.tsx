'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ScanLine, Package, Plus, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'

type ScanState = 'scanning' | 'loading' | 'found' | 'not-found'

interface FoundItem {
  id: number
  name: string
  sku: string
  quantity: number
  unit: string
  minQuantity: number | null
  category: { name: string } | null
  location: { name: string } | null
}

const BarcodeScanner = dynamic(
  () => import('@/components/scanner/barcode-scanner').then((m) => m.BarcodeScanner),
  { ssr: false, loading: () => <Loading /> }
)

export default function ScanPage() {
  const t = useTranslations('scan')
  const [state, setState] = useState<ScanState>('scanning')
  const [scannedBarcode, setScannedBarcode] = useState('')
  const [foundItem, setFoundItem] = useState<FoundItem | null>(null)

  const handleScan = useCallback(async (barcode: string) => {
    if (state !== 'scanning') return

    setScannedBarcode(barcode)
    setState('loading')

    try {
      const res = await fetch(`/api/scan?barcode=${encodeURIComponent(barcode)}`)
      const json = await res.json()

      if (json.success) {
        setFoundItem(json.data)
        setState('found')
      } else {
        setState('not-found')
      }
    } catch {
      setState('not-found')
    }
  }, [state])

  function handleScanAgain() {
    setFoundItem(null)
    setScannedBarcode('')
    setState('scanning')
  }

  const isLowStock =
    foundItem?.minQuantity != null && foundItem.quantity <= foundItem.minQuantity

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {(state === 'scanning' || state === 'loading') && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
            {state === 'scanning' && <BarcodeScanner onScan={handleScan} />}
            {state === 'loading' && (
              <div className="flex h-48 items-center justify-center">
                <Loading text={t('lookingUp')} />
              </div>
            )}
          </div>
          <p className="text-center text-xs text-gray-400">
            <ScanLine size={14} className="inline mr-1" />
            {t('supportedFormats')}
          </p>
        </div>
      )}

      {state === 'found' && foundItem && (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <Package size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{foundItem.name}</p>
                  {isLowStock && <Badge variant="warning">{t('lowStockBadge')}</Badge>}
                </div>
                <p className="text-xs text-gray-500">{t('skuLabel')}: {foundItem.sku}</p>
                {foundItem.category && (
                  <p className="text-xs text-gray-500">{foundItem.category.name}</p>
                )}
                {foundItem.location && (
                  <p className="text-xs text-gray-500">{foundItem.location.name}</p>
                )}
                <p className="mt-2 text-lg font-bold text-gray-900">
                  {foundItem.quantity}{' '}
                  <span className="text-sm font-normal text-gray-500">{foundItem.unit}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/items/${foundItem.id}`} className="flex-1">
              <Button className="w-full">{t('viewDetails')}</Button>
            </Link>
            <Button variant="secondary" onClick={handleScanAgain} aria-label={t('scanAgain')}>
              <RotateCcw size={16} />
            </Button>
          </div>
        </div>
      )}

      {state === 'not-found' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-center">
            <ScanLine size={32} className="mx-auto mb-2 text-yellow-500" />
            <p className="font-medium text-gray-900">{t('noItemFound')}</p>
            <p className="mt-1 text-sm text-gray-500 font-mono">{scannedBarcode}</p>
          </div>

          <div className="flex gap-2">
            <Link href={`/items/new?barcode=${encodeURIComponent(scannedBarcode)}`} className="flex-1">
              <Button className="w-full">
                <Plus size={16} className="mr-1" />
                {t('addAsNew')}
              </Button>
            </Link>
            <Button variant="secondary" onClick={handleScanAgain} aria-label={t('scanAgain')}>
              <RotateCcw size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
