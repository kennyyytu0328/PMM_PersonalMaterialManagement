'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

type StockType = 'IN' | 'OUT' | 'ADJUST'

interface StockModalProps {
  open: boolean
  onClose: () => void
  itemId: number
  itemName: string
  type: StockType
  onSuccess: () => void
}

export function StockModal({ open, onClose, itemId, itemName, type, onSuccess }: StockModalProps) {
  const { toast } = useToast()
  const t = useTranslations('stockModal')
  const tCommon = useTranslations('common')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const titleKey: Record<StockType, 'titleIn' | 'titleOut' | 'titleAdjust'> = {
    IN: 'titleIn',
    OUT: 'titleOut',
    ADJUST: 'titleAdjust',
  }
  const title = t(titleKey[type])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const qty = parseInt(quantity)
    if (!qty || qty <= 0) {
      toast(t('invalidQuantity'), 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, type, quantity: qty, note: note || undefined }),
      })

      const json = await res.json()

      if (!json.success) {
        toast(json.error ?? t('failedToRecord'), 'error')
        return
      }

      toast(t('recordedSuccess', { action: title }), 'success')
      setQuantity('')
      setNote('')
      onSuccess()
      onClose()
    } catch {
      toast(tCommon('somethingWentWrong'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-4 text-sm text-gray-500">{itemName}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="quantity"
          label={t('quantityLabel')}
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={t('quantityPlaceholder')}
          required
        />
        <Input
          id="note"
          label={t('noteLabel')}
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('notePlaceholder')}
        />
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? tCommon('saving') : t('confirm')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
