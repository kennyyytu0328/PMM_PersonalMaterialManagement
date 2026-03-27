'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'

interface Category {
  id: number
  name: string
}

interface Location {
  id: number
  name: string
}

interface ItemFormData {
  name: string
  description: string
  barcode: string
  categoryId: string
  locationId: string
  quantity: string
  minQuantity: string
  unit: string
  unitCost: string
}

interface ItemFormProps {
  itemId?: number
  initialData?: Partial<ItemFormData>
  defaultBarcode?: string
}

const defaultFormData: ItemFormData = {
  name: '',
  description: '',
  barcode: '',
  categoryId: '',
  locationId: '',
  quantity: '0',
  minQuantity: '',
  unit: 'pcs',
  unitCost: '',
}

export function ItemForm({ itemId, initialData, defaultBarcode }: ItemFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<ItemFormData>({
    ...defaultFormData,
    ...initialData,
    barcode: initialData?.barcode ?? defaultBarcode ?? '',
  })

  useEffect(() => {
    async function fetchOptions() {
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
    fetchOptions()
  }, [])

  function handleChange(field: keyof ItemFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name.trim()) {
      toast('Item name is required', 'error')
      return
    }

    setSubmitting(true)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      locationId: form.locationId ? parseInt(form.locationId) : undefined,
      quantity: parseInt(form.quantity) || 0,
      minQuantity: form.minQuantity ? parseInt(form.minQuantity) : undefined,
      unit: form.unit || 'pcs',
      unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined,
    }

    try {
      const url = itemId ? `/api/items/${itemId}` : '/api/items'
      const method = itemId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!json.success) {
        toast(json.error ?? 'Failed to save item', 'error')
        return
      }

      toast(itemId ? 'Item updated successfully' : 'Item created successfully', 'success')
      router.push(itemId ? `/items/${itemId}` : `/items/${json.data.id}`)
    } catch {
      toast('Something went wrong', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))
  const locationOptions = locations.map((l) => ({ value: l.id, label: l.name }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="name"
        label="Name *"
        type="text"
        value={form.name}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder="Item name"
        required
      />
      <div className="space-y-1">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Optional description"
          rows={3}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <Input
        id="barcode"
        label="Barcode"
        type="text"
        value={form.barcode}
        onChange={(e) => handleChange('barcode', e.target.value)}
        placeholder="Scan or enter barcode"
      />
      <Select
        id="categoryId"
        label="Category"
        options={categoryOptions}
        placeholder="Select category"
        value={form.categoryId}
        onChange={(e) => handleChange('categoryId', e.target.value)}
      />
      <Select
        id="locationId"
        label="Location"
        options={locationOptions}
        placeholder="Select location"
        value={form.locationId}
        onChange={(e) => handleChange('locationId', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="quantity"
          label="Quantity"
          type="number"
          min="0"
          value={form.quantity}
          onChange={(e) => handleChange('quantity', e.target.value)}
        />
        <Input
          id="minQuantity"
          label="Min Quantity"
          type="number"
          min="0"
          value={form.minQuantity}
          onChange={(e) => handleChange('minQuantity', e.target.value)}
          placeholder="Low stock threshold"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="unit"
          label="Unit"
          type="text"
          value={form.unit}
          onChange={(e) => handleChange('unit', e.target.value)}
          placeholder="pcs, kg, m..."
        />
        <Input
          id="unitCost"
          label="Unit Cost ($)"
          type="number"
          min="0"
          step="0.01"
          value={form.unitCost}
          onChange={(e) => handleChange('unitCost', e.target.value)}
          placeholder="0.00"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitting ? 'Saving...' : itemId ? 'Update Item' : 'Create Item'}
        </Button>
      </div>
    </form>
  )
}
