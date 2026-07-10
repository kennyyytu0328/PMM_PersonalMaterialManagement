'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { Pencil, ArrowLeftRight, RefreshCw, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Loading } from '@/components/ui/loading'
import { useToast } from '@/components/ui/toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AssetStatusBadge } from '@/components/assets/asset-status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

interface PersonRef {
  id: number
  name: string
}

interface AssetEvent {
  id: number
  type: 'REGISTER' | 'TRANSFER' | 'STATUS_CHANGE' | 'SCRAP_REQUESTED' | 'SCRAP_APPROVED' | 'SCRAP_REJECTED'
  fromCustodian: PersonRef | null
  toCustodian: PersonRef | null
  fromStatus: string | null
  toStatus: string | null
  note: string | null
  performer: PersonRef | null
  createdAt: string
}

interface AssetDetail {
  id: number
  assetNo: string
  name: string
  description: string | null
  status: string
  category: { name: string } | null
  location: { name: string } | null
  custodian: PersonRef | null
  acquiredAt: string | null
  cost: number | null
  vendor: string | null
  barcode: string | null
  scrappedAt: string | null
  scrapReason: string | null
  events: AssetEvent[]
  pendingScrapRequest: { id: number; reason: string } | null
}

const CHANGEABLE_STATUSES = ['idle', 'in_use', 'repair', 'lent_out', 'lost'] as const

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('assetDetail')
  const tStatus = useTranslations('assets.status')
  const tCommon = useTranslations('common')
  const { toast } = useToast()
  const [asset, setAsset] = useState<AssetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState<PersonRef[]>([])
  const [activeModal, setActiveModal] = useState<'transfer' | 'status' | 'scrap' | null>(null)
  const [transferCustodianId, setTransferCustodianId] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [scrapReason, setScrapReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchAsset = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/assets/${id}`)
      const json = await res.json()
      if (json.success) setAsset(json.data)
    } catch {
      toast(t('loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [id, toast, t])

  useEffect(() => {
    fetchAsset()
  }, [fetchAsset])

  useEffect(() => {
    async function fetchPeople() {
      try {
        const res = await apiFetch('/api/people?activeOnly=true')
        const json = await res.json()
        if (json.success) setPeople(json.data)
      } catch {
        // transfer modal will show empty custodian list
      }
    }
    fetchPeople()
  }, [])

  function closeModal() {
    setActiveModal(null)
    setTransferCustodianId('')
    setTransferNote('')
    setNewStatus('')
    setStatusNote('')
    setScrapReason('')
  }

  async function submitAction(url: string, body: object, successMsg: string, failMsg: string) {
    setSubmitting(true)
    try {
      const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        toast(successMsg, 'success')
        closeModal()
        setLoading(true)
        await fetchAsset()
      } else {
        toast(json.error ?? failMsg, 'error')
      }
    } catch {
      toast(failMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function handleTransfer() {
    if (!transferCustodianId) {
      toast(t('transferModal.custodianRequired'), 'error')
      return
    }
    submitAction(
      `/api/assets/${id}/transfer`,
      { custodianId: parseInt(transferCustodianId), note: transferNote.trim() || undefined },
      t('transferModal.success'),
      t('transferModal.failed')
    )
  }

  function handleStatusChange() {
    if (!newStatus) return
    submitAction(
      `/api/assets/${id}/status`,
      { status: newStatus, note: statusNote.trim() || undefined },
      t('statusModal.success'),
      t('statusModal.failed')
    )
  }

  function handleScrapRequest() {
    if (!scrapReason.trim()) {
      toast(t('scrapModal.reasonRequired'), 'error')
      return
    }
    submitAction(
      '/api/scrap-requests',
      { assetId: parseInt(id), reason: scrapReason.trim() },
      t('scrapModal.success'),
      t('scrapModal.failed')
    )
  }

  if (loading) return <Loading />
  if (!asset) {
    return <p className="py-10 text-center text-sm text-gray-500">{t('notFound')}</p>
  }

  const actionable = asset.status !== 'scrapped' && !asset.pendingScrapRequest
  const custodianOptions = people.map((p) => ({ value: p.id, label: p.name }))
  const statusOptions = CHANGEABLE_STATUSES.filter((s) => s !== asset.status).map((s) => ({
    value: s,
    label: tStatus(s),
  }))

  const infoRows: Array<[string, string]> = [
    [t('assetNo'), asset.assetNo],
    [t('custodian'), asset.custodian?.name ?? t('noCustodian')],
    ...(asset.category ? ([[t('category'), asset.category.name]] as Array<[string, string]>) : []),
    ...(asset.location ? ([[t('location'), asset.location.name]] as Array<[string, string]>) : []),
    ...(asset.acquiredAt ? ([[t('acquiredAt'), asset.acquiredAt]] as Array<[string, string]>) : []),
    ...(asset.cost != null ? ([[t('cost'), formatCurrency(asset.cost)]] as Array<[string, string]>) : []),
    ...(asset.vendor ? ([[t('vendor'), asset.vendor]] as Array<[string, string]>) : []),
    ...(asset.barcode ? ([[t('barcode'), asset.barcode]] as Array<[string, string]>) : []),
    ...(asset.scrappedAt
      ? ([[t('scrappedAt'), formatDate(asset.scrappedAt)]] as Array<[string, string]>)
      : []),
    ...(asset.scrapReason ? ([[t('scrapReason'), asset.scrapReason]] as Array<[string, string]>) : []),
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-gray-900">{asset.name}</h1>
            <AssetStatusBadge status={asset.status} />
          </div>
          {asset.description && <p className="mt-1 text-sm text-gray-500">{asset.description}</p>}
        </div>
      </div>

      {asset.pendingScrapRequest && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          {t('pendingScrapNotice')}
        </div>
      )}

      <Card>
        <CardContent>
          <dl className="divide-y divide-gray-100">
            {infoRows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2 text-sm">
                <dt className="text-gray-500">{label}</dt>
                <dd className="text-right font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {actionable && (
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/assets/${asset.id}/edit`}>
            <Button variant="secondary" className="w-full">
              <Pencil size={16} className="mr-1" />
              {t('edit')}
            </Button>
          </Link>
          <Button className="w-full" onClick={() => setActiveModal('transfer')}>
            <ArrowLeftRight size={16} className="mr-1" />
            {t('transfer')}
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setActiveModal('status')}>
            <RefreshCw size={16} className="mr-1" />
            {t('changeStatus')}
          </Button>
          <Button variant="danger" className="w-full" onClick={() => setActiveModal('scrap')}>
            <Trash2 size={16} className="mr-1" />
            {t('requestScrap')}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('history')}</CardTitle>
        </CardHeader>
        <CardContent>
          {asset.events.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">{t('noEvents')}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {asset.events.map((event) => (
                <div key={event.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900">{t(`events.${event.type}`)}</p>
                    <p className="shrink-0 text-xs text-gray-400">{formatDate(event.createdAt)}</p>
                  </div>
                  {event.type === 'TRANSFER' && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {event.fromCustodian?.name ?? '—'} → {event.toCustodian?.name ?? '—'}
                    </p>
                  )}
                  {event.type === 'STATUS_CHANGE' && event.fromStatus && event.toStatus && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {tStatus(event.fromStatus)} → {tStatus(event.toStatus)}
                    </p>
                  )}
                  {event.note && <p className="mt-0.5 text-xs text-gray-500">{event.note}</p>}
                  {event.performer && (
                    <p className="mt-0.5 text-xs text-gray-400">{event.performer.name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={activeModal === 'transfer'} onClose={closeModal} title={t('transferModal.title')}>
        <div className="space-y-4">
          <Select
            id="transfer-custodian"
            label={t('transferModal.custodianLabel')}
            options={custodianOptions.filter((o) => o.value !== asset.custodian?.id)}
            placeholder={t('transferModal.custodianPlaceholder')}
            value={transferCustodianId}
            onChange={(e) => setTransferCustodianId(e.target.value)}
          />
          <NoteTextarea
            id="transfer-note"
            label={t('transferModal.noteLabel')}
            value={transferNote}
            onChange={setTransferNote}
          />
          <ModalActions
            onCancel={closeModal}
            onSubmit={handleTransfer}
            submitLabel={t('transferModal.submit')}
            cancelLabel={tCommon('cancel')}
            submitting={submitting}
          />
        </div>
      </Modal>

      <Modal open={activeModal === 'status'} onClose={closeModal} title={t('statusModal.title')}>
        <div className="space-y-4">
          <Select
            id="new-status"
            label={t('statusModal.statusLabel')}
            options={statusOptions}
            placeholder={t('statusModal.statusLabel')}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          />
          <NoteTextarea
            id="status-note"
            label={t('statusModal.noteLabel')}
            value={statusNote}
            onChange={setStatusNote}
          />
          <ModalActions
            onCancel={closeModal}
            onSubmit={handleStatusChange}
            submitLabel={t('statusModal.submit')}
            cancelLabel={tCommon('cancel')}
            submitting={submitting}
          />
        </div>
      </Modal>

      <Modal open={activeModal === 'scrap'} onClose={closeModal} title={t('scrapModal.title')}>
        <div className="space-y-4">
          <NoteTextarea
            id="scrap-reason"
            label={t('scrapModal.reasonLabel')}
            placeholder={t('scrapModal.reasonPlaceholder')}
            value={scrapReason}
            onChange={setScrapReason}
          />
          <ModalActions
            onCancel={closeModal}
            onSubmit={handleScrapRequest}
            submitLabel={t('scrapModal.submit')}
            cancelLabel={tCommon('cancel')}
            submitting={submitting}
            danger
          />
        </div>
      </Modal>
    </div>
  )
}

function NoteTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

function ModalActions({
  onCancel,
  onSubmit,
  submitLabel,
  cancelLabel,
  submitting,
  danger,
}: {
  onCancel: () => void
  onSubmit: () => void
  submitLabel: string
  cancelLabel: string
  submitting: boolean
  danger?: boolean
}) {
  return (
    <div className="flex gap-2 pt-2">
      <Button variant="secondary" className="flex-1" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant={danger ? 'danger' : 'primary'}
        className="flex-1"
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitLabel}
      </Button>
    </div>
  )
}
