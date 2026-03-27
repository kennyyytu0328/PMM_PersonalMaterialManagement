'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'

interface User {
  id: number
  name: string
  email: string
}

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  itemId: number
  itemName: string
  onSuccess: () => void
}

export function CheckoutModal({ open, onClose, itemId, itemName, onSuccess }: CheckoutModalProps) {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [userId, setUserId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    if (!open) return

    async function fetchUsers() {
      setLoadingUsers(true)
      try {
        const res = await fetch('/api/users')
        const json = await res.json()
        if (json.success) {
          setUsers(json.data)
        }
      } catch {
        // fail silently
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const qty = parseInt(quantity)
    if (!qty || qty <= 0) {
      toast('Please enter a valid quantity', 'error')
      return
    }

    if (!userId) {
      toast('Please select a user', 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/checkouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          userId: parseInt(userId),
          quantity: qty,
          dueDate: dueDate || undefined,
          note: note || undefined,
        }),
      })

      const json = await res.json()

      if (!json.success) {
        toast(json.error ?? 'Failed to create checkout', 'error')
        return
      }

      toast('Item checked out successfully', 'success')
      setUserId('')
      setQuantity('1')
      setDueDate('')
      setNote('')
      onSuccess()
      onClose()
    } catch {
      toast('Something went wrong', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const userOptions = users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))

  return (
    <Modal open={open} onClose={onClose} title="Check Out Item">
      <p className="mb-4 text-sm text-gray-500">{itemName}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          id="userId"
          label="Assign To"
          options={userOptions}
          placeholder={loadingUsers ? 'Loading users...' : 'Select a user'}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        />
        <Input
          id="quantity"
          label="Quantity"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
        <Input
          id="dueDate"
          label="Due Date (optional)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
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
          <Button type="submit" className="flex-1" disabled={submitting || loadingUsers}>
            {submitting ? 'Processing...' : 'Check Out'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
