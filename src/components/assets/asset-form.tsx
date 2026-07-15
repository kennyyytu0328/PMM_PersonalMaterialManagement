'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { SerialOcrScanner } from '@/components/scanner/serial-ocr-scanner'
import { apiFetch } from '@/lib/api'

interface Option {
  id: number
  name: string
}

export interface AssetFormData {
  name: string
  assetNo: string
  description: string
  categoryId: string
  locationId: string
  custodianId: string
  acquiredAt: string
  cost: string
  vendor: string
  barcode: string
  serialNo: string
}

interface AssetFormProps {
  assetId?: number
  initialData?: Partial<AssetFormData>
}

const defaultFormData: AssetFormData = {
  name: '',
  assetNo: '',
  description: '',
  categoryId: '',
  locationId: '',
  custodianId: '',
  acquiredAt: '',
  cost: '',
  vendor: '',
  barcode: '',
  serialNo: '',
}

export function AssetForm({ assetId, initialData }: AssetFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('assetForm')
  const tCommon = useTranslations('common')
  const [categories, setCategories] = useState<Option[]>([])
  const [locations, setLocations] = useState<Option[]>([])
  const [people, setPeople] = useState<Option[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showOcr, setShowOcr] = useState(false)
  const [form, setForm] = useState<AssetFormData>({ ...defaultFormData, ...initialData })

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [catRes, locRes, peopleRes] = await Promise.all([
          apiFetch('/api/categories'),
          apiFetch('/api/locations'),
          apiFetch('/api/people?activeOnly=true'),
        ])
        if (!catRes.ok || !locRes.ok || !peopleRes.ok) {
          console.error(
            'Failed to fetch options:',
            catRes.status,
            locRes.status,
            peopleRes.status
          )
          return
        }
        const catJson = await catRes.json()
        const locJson = await locRes.json()
        const peopleJson = await peopleRes.json()
        if (catJson.success) setCategories(catJson.data)
        if (locJson.success) setLocations(locJson.data)
        if (peopleJson.success) setPeople(peopleJson.data)
      } catch (error) {
        console.error('Error fetching form options:', error)
      }
    }
    fetchOptions()
  }, [])

  function handleChange(field: keyof AssetFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name.trim()) {
      toast(t('nameRequired'), 'error')
      return
    }

    setSubmitting(true)

    const payload = {
      name: form.name.trim(),
      assetNo: form.assetNo.trim() || undefined,
      description: form.description.trim() || undefined,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      locationId: form.locationId ? parseInt(form.locationId) : undefined,
      custodianId: form.custodianId ? parseInt(form.custodianId) : undefined,
      acquiredAt: form.acquiredAt || undefined,
      cost: form.cost ? parseFloat(form.cost) : undefined,
      vendor: form.vendor.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      serialNo: form.serialNo.trim() || undefined,
    }

    try {
      const url = assetId ? `/api/assets/${assetId}` : '/api/assets'
      const method = assetId ? 'PUT' : 'POST'

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!json.success) {
        toast(json.error ?? t('saveFailed'), 'error')
        return
      }

      toast(assetId ? t('updatedSuccess') : t('createdSuccess'), 'success')
      router.push(assetId ? `/assets/${assetId}` : `/assets/${json.data.id}`)
    } catch {
      toast(tCommon('somethingWentWrong'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))
  const locationOptions = locations.map((l) => ({ value: l.id, label: l.name }))
  const peopleOptions = people.map((p) => ({ value: p.id, label: p.name }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="asset-name"
        label={t('nameLabel')}
        type="text"
        value={form.name}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder={t('namePlaceholder')}
        required
      />
      <Input
        id="asset-no"
        label={t('assetNoLabel')}
        type="text"
        value={form.assetNo}
        onChange={(e) => handleChange('assetNo', e.target.value)}
        placeholder={t('assetNoPlaceholder')}
      />
      <div className="space-y-1">
        <label htmlFor="asset-description" className="block text-sm font-medium text-gray-700">
          {t('descriptionLabel')}
        </label>
        <textarea
          id="asset-description"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          rows={3}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <Select
        id="asset-category"
        label={t('categoryLabel')}
        options={categoryOptions}
        placeholder={t('categoryPlaceholder')}
        value={form.categoryId}
        onChange={(e) => handleChange('categoryId', e.target.value)}
      />
      <Select
        id="asset-location"
        label={t('locationLabel')}
        options={locationOptions}
        placeholder={t('locationPlaceholder')}
        value={form.locationId}
        onChange={(e) => handleChange('locationId', e.target.value)}
      />
      {!assetId && (
        <Select
          id="asset-custodian"
          label={t('custodianLabel')}
          options={peopleOptions}
          placeholder={t('custodianPlaceholder')}
          value={form.custodianId}
          onChange={(e) => handleChange('custodianId', e.target.value)}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="asset-acquired-at"
          label={t('acquiredAtLabel')}
          type="date"
          value={form.acquiredAt}
          onChange={(e) => handleChange('acquiredAt', e.target.value)}
        />
        <Input
          id="asset-cost"
          label={t('costLabel')}
          type="number"
          min="0"
          step="0.01"
          value={form.cost}
          onChange={(e) => handleChange('cost', e.target.value)}
          placeholder={t('costPlaceholder')}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="asset-vendor"
          label={t('vendorLabel')}
          type="text"
          value={form.vendor}
          onChange={(e) => handleChange('vendor', e.target.value)}
          placeholder={t('vendorPlaceholder')}
        />
        <Input
          id="asset-barcode"
          label={t('barcodeLabel')}
          type="text"
          value={form.barcode}
          onChange={(e) => handleChange('barcode', e.target.value)}
          placeholder={t('barcodePlaceholder')}
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            id="serial-no"
            label={t('serialNoLabel')}
            type="text"
            value={form.serialNo}
            onChange={(e) => handleChange('serialNo', e.target.value)}
            placeholder={t('serialNoPlaceholder')}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowOcr(true)}
          aria-label={t('scanSerial')}
        >
          <Camera size={16} />
        </Button>
      </div>

      <Modal open={showOcr} onClose={() => setShowOcr(false)} title={t('scanSerialTitle')}>
        <SerialOcrScanner
          onDetected={(text) => {
            handleChange('serialNo', text)
            setShowOcr(false)
          }}
        />
      </Modal>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={() => router.back()}
        >
          {tCommon('cancel')}
        </Button>
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitting ? tCommon('saving') : assetId ? t('updateAsset') : t('createAsset')}
        </Button>
      </div>
    </form>
  )
}
