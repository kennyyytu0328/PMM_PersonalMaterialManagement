'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Edit, Package, MapPin, Tag, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { StockModal } from '@/components/items/stock-modal'
import { CheckoutModal } from '@/components/items/checkout-modal'
import { ActivityItem } from '@/components/activity/activity-item'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Item {
  id: number
  name: string
  sku: string
  barcode: string | null
  description: string | null
  quantity: number
  minQuantity: number | null
  unit: string
  unitCost: number | null
  category: { id: number; name: string } | null
  location: { id: number; name: string } | null
  createdAt: string
  updatedAt: string
}

interface Transaction {
  id: number
  type: 'IN' | 'OUT' | 'ADJUST'
  quantity: number
  note: string | null
  createdAt: string
  performer: { name: string } | null
}

interface Checkout {
  id: number
  quantity: number
  checkedOutAt: string
  dueDate: string | null
  note: string | null
  user: { id: number; name: string; email: string }
}

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()

  const [item, setItem] = useState<Item | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeCheckouts, setActiveCheckouts] = useState<Checkout[]>([])
  const [loading, setLoading] = useState(true)

  const [stockModal, setStockModal] = useState<{ open: boolean; type: 'IN' | 'OUT' | 'ADJUST' }>({
    open: false,
    type: 'IN',
  })
  const [checkoutModal, setCheckoutModal] = useState(false)
  const [returningId, setReturningId] = useState<number | null>(null)

  const userRole = (session?.user as any)?.role
  const canEdit = userRole === 'admin' || userRole === 'staff'

  async function loadData() {
    try {
      const [itemRes, txRes, coRes] = await Promise.all([
        fetch(`/api/items/${id}`),
        fetch(`/api/transactions?itemId=${id}&limit=20`),
        fetch(`/api/checkouts?itemId=${id}&activeOnly=true`),
      ])

      const itemJson = await itemRes.json()
      const txJson = await txRes.json()
      const coJson = await coRes.json()

      if (!itemJson.success) {
        router.push('/items')
        return
      }

      setItem(itemJson.data)
      if (txJson.success) setTransactions(txJson.data)
      if (coJson.success) setActiveCheckouts(coJson.data)
    } catch {
      router.push('/items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  async function handleReturn(checkoutId: number) {
    setReturningId(checkoutId)
    try {
      const res = await fetch(`/api/checkouts/${checkoutId}/return`, {
        method: 'POST',
      })
      const json = await res.json()

      if (!json.success) {
        toast(json.error ?? 'Failed to return item', 'error')
        return
      }

      toast('Item returned successfully', 'success')
      loadData()
    } catch {
      toast('Something went wrong', 'error')
    } finally {
      setReturningId(null)
    }
  }

  if (loading) return <Loading text="Loading item..." />
  if (!item) return null

  const isLowStock = item.minQuantity != null && item.quantity <= item.minQuantity

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <Link href="/items">
          <button className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <h1 className="flex-1 truncate text-xl font-bold text-gray-900">{item.name}</h1>
        {canEdit && (
          <Link href={`/items/${id}/edit`}>
            <Button variant="ghost" size="sm">
              <Edit size={16} />
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {item.quantity}
                  <span className="ml-1 text-base font-normal text-gray-500">{item.unit}</span>
                </p>
                {isLowStock && (
                  <Badge variant="warning" className="mt-1">
                    Low Stock — min {item.minQuantity}
                  </Badge>
                )}
              </div>
              {item.unitCost != null && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Unit Cost</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(item.unitCost)}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5 border-t border-gray-100 pt-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-gray-400" />
                <span className="font-medium">SKU:</span>
                <span className="font-mono">{item.sku}</span>
              </div>
              {item.barcode && (
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-gray-400" />
                  <span className="font-medium">Barcode:</span>
                  <span className="font-mono">{item.barcode}</span>
                </div>
              )}
              {item.category && (
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-gray-400" />
                  <span className="font-medium">Category:</span>
                  <span>{item.category.name}</span>
                </div>
              )}
              {item.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="font-medium">Location:</span>
                  <span>{item.location.name}</span>
                </div>
              )}
              {item.description && (
                <p className="pt-1 text-gray-500">{item.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStockModal({ open: true, type: 'IN' })}
          >
            Stock In
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStockModal({ open: true, type: 'OUT' })}
          >
            Stock Out
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCheckoutModal(true)}
          >
            Check Out
          </Button>
        </div>
      )}

      {activeCheckouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Checkouts ({activeCheckouts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeCheckouts.map((co) => (
                <div
                  key={co.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{co.user.name}</p>
                    <p className="text-xs text-gray-500">
                      {co.quantity} {item.unit} · {formatDate(co.checkedOutAt)}
                      {co.dueDate ? ` · Due: ${formatDate(co.dueDate)}` : ''}
                    </p>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={returningId === co.id}
                      onClick={() => handleReturn(co.id)}
                    >
                      {returningId === co.id ? '...' : 'Return'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No transactions yet</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <ActivityItem
                  key={tx.id}
                  itemName={item.name}
                  type={tx.type}
                  quantity={tx.quantity}
                  timestamp={tx.createdAt}
                  performedBy={tx.performer?.name}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <StockModal
        open={stockModal.open}
        onClose={() => setStockModal((s) => ({ ...s, open: false }))}
        itemId={item.id}
        itemName={item.name}
        type={stockModal.type}
        onSuccess={loadData}
      />

      <CheckoutModal
        open={checkoutModal}
        onClose={() => setCheckoutModal(false)}
        itemId={item.id}
        itemName={item.name}
        onSuccess={loadData}
      />
    </div>
  )
}
