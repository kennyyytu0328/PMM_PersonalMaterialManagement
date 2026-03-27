'use client'

import { useState } from 'react'
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

const typeLabels: Record<StockType, string> = {
  IN: 'Stock In',
  OUT: 'Stock Out',
  ADJUST: 'Adjust Stock',
}

export function StockModal({ open, onClose, itemId, itemName, type, onSuccess }: StockModalProps) {
  const { toast } = useToast()
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const qty = parseInt(quantity)
    if (!qty || qty <= 0) {
      toast('Please enter a valid quantity', 'error')
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
        toast(json.error ?? 'Failed to record transaction', 'error')
        return
      }

      toast(`${typeLabels[type]} recorded successfully`, 'success')
      setQuantity('')
      setNote('')
      onSuccess()
      onClose()
    } catch {
      toast('Something went wrong', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={typeLabels[type]}>
      <p className="mb-4 text-sm text-gray-500">{itemName}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="quantity"
          label="Quantity"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Enter quantity"
          required
        />
        <Input
          id="note"
          label="Note (optional)"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note..."
        />
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? 'Saving...' : 'Confirm'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
