'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Briefcase, Plus, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { AssetStatusBadge } from '@/components/assets/asset-status-badge'
import { ASSET_STATUSES } from '@/lib/asset-guards'
import { apiFetch } from '@/lib/api'

interface AssetRow {
  id: number
  assetNo: string
  name: string
  status: string
  custodian: { id: number; name: string } | null
  category: { id: number; name: string } | null
  location: { id: number; name: string } | null
}

interface Option {
  id: number
  name: string
}

export default function AssetsPage() {
  const t = useTranslations('assets')
  const { toast } = useToast()
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [custodianId, setCustodianId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [people, setPeople] = useState<Option[]>([])
  const [categories, setCategories] = useState<Option[]>([])

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [peopleRes, catRes] = await Promise.all([
          apiFetch('/api/people'),
          apiFetch('/api/categories'),
        ])
        const peopleJson = await peopleRes.json()
        const catJson = await catRes.json()
        if (peopleJson.success) setPeople(peopleJson.data)
        if (catJson.success) setCategories(catJson.data)
      } catch {
        // filters remain empty — list still works
      }
    }
    fetchOptions()
  }, [])

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (custodianId) params.set('custodianId', custodianId)
      if (categoryId) params.set('categoryId', categoryId)
      const res = await apiFetch(`/api/assets?${params.toString()}`)
      const json = await res.json()
      if (json.success) setAssets(json.data)
    } catch {
      toast(t('loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [search, status, custodianId, categoryId, toast, t])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const statusOptions = ASSET_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))
  const custodianOptions = people.map((p) => ({ value: p.id, label: p.name }))
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <Link href="/assets/new">
          <Button size="sm">
            <Plus size={16} className="mr-1" />
            {t('add')}
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            id="asset-search"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select
            id="filter-status"
            options={statusOptions}
            placeholder={t('allStatuses')}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <Select
            id="filter-custodian"
            options={custodianOptions}
            placeholder={t('allCustodians')}
            value={custodianId}
            onChange={(e) => setCustodianId(e.target.value)}
          />
          <Select
            id="filter-category"
            options={categoryOptions}
            placeholder={t('allCategories')}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : assets.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={40} />}
          title={t('noAssets')}
          description={t('noAssetsDesc')}
          action={
            <Link href="/assets/new">
              <Button size="sm">{t('add')}</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              href={`/assets/${asset.id}`}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-blue-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-gray-900">{asset.name}</p>
                    <AssetStatusBadge status={asset.status} />
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-gray-500">{asset.assetNo}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {asset.custodian
                      ? `${t('custodian')}: ${asset.custodian.name}`
                      : (asset.location?.name ?? '')}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
