'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ClipboardCheck, Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

interface ScrapRequestRow {
  id: number
  reason: string
  createdAt: string
  asset: { id: number; name: string; assetNo: string }
  requester: { id: number; name: string } | null
}

export default function ScrapApprovalsPage() {
  const t = useTranslations('scrapRequests')
  const tCommon = useTranslations('common')
  const { toast } = useToast()
  const [requests, setRequests] = useState<ScrapRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<{
    request: ScrapRequestRow
    action: 'approve' | 'reject'
  } | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchRequests = useCallback(async () => {
    try {
      const res = await apiFetch('/api/scrap-requests?status=pending&limit=100')
      const json = await res.json()
      if (json.success) setRequests(json.data)
    } catch {
      toast(t('loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [toast, t])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  function closeModal() {
    setReviewing(null)
    setReviewNote('')
  }

  async function handleReview() {
    if (!reviewing) return
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/scrap-requests/${reviewing.request.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewing.action,
          reviewNote: reviewNote.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast(reviewing.action === 'approve' ? t('approved') : t('rejected'), 'success')
        closeModal()
        setLoading(true)
        await fetchRequests()
      } else {
        toast(json.error ?? t('reviewFailed'), 'error')
      }
    } catch {
      toast(t('reviewFailed'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-bold text-charcoal">{t('title')}</h1>

      {loading ? (
        <Loading />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={40} />}
          title={t('noRequests')}
          description={t('noRequestsDesc')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-[20px] border border-mist bg-white p-4"
            >
              <Link
                href={`/assets/${request.asset.id}`}
                className="font-medium text-charcoal hover:text-teal"
              >
                {request.asset.name}
              </Link>
              <p className="mt-0.5 font-mono text-xs text-pewter">{request.asset.assetNo}</p>
              <p className="mt-2 text-sm text-charcoal">
                <span className="text-pewter">{t('reason')}: </span>
                {request.reason}
              </p>
              <p className="mt-1 text-xs text-pewter/70">
                {t('requestedBy', { name: request.requester?.name ?? '—' })} ·{' '}
                {formatDate(request.createdAt)}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setReviewing({ request, action: 'approve' })}
                >
                  <Check size={16} className="mr-1" />
                  {t('approve')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setReviewing({ request, action: 'reject' })}
                >
                  <X size={16} className="mr-1" />
                  {t('reject')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!reviewing}
        onClose={closeModal}
        title={reviewing?.action === 'approve' ? t('approveTitle') : t('rejectTitle')}
      >
        <div className="space-y-4">
          {reviewing && (
            <p className="text-sm text-charcoal">
              {reviewing.request.asset.name}{' '}
              <span className="font-mono text-xs text-pewter">
                {reviewing.request.asset.assetNo}
              </span>
            </p>
          )}
          <div className="space-y-1">
            <label htmlFor="review-note" className="block text-sm font-medium text-charcoal">
              {t('reviewNoteLabel')}
            </label>
            <textarea
              id="review-note"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              className="block w-full rounded-full border border-mist px-3 py-2 text-sm placeholder:text-pewter/70 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={closeModal}>
              {tCommon('cancel')}
            </Button>
            <Button className="flex-1" onClick={handleReview} disabled={submitting}>
              {t('confirmSubmit')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
