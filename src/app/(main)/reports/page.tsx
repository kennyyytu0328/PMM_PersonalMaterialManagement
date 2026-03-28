'use client'

import { useEffect, useState } from 'react'
import { BarChart2, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { StockChart } from '@/components/reports/stock-chart'
import { formatCurrency } from '@/lib/utils'

interface SummaryStats {
  totalItems: number
  totalValue: number
  lowStockCount: number
  activeCheckouts: number
}

interface MovementRow {
  date: string
  type: 'IN' | 'OUT' | 'ADJUST'
  total: number
}

interface LowStockItem {
  id: number
  name: string
  sku: string
  quantity: number
  minQuantity: number | null
}

interface CategoryBreakdown {
  categoryName: string
  count: number
  totalQuantity: string | number | null
}

interface ReportsData {
  summary: SummaryStats | null
  movements: MovementRow[]
  lowStock: LowStockItem[]
  categories: CategoryBreakdown[]
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}

function StatCard({ label, value, sub, highlight }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${highlight ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${highlight ? 'text-red-500' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData>({
    summary: null,
    movements: [],
    lowStock: [],
    categories: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadReports = async () => {
      try {
        const [summaryRes, movementsRes, lowStockRes] = await Promise.all([
          fetch('/api/reports?type=summary'),
          fetch('/api/reports?type=movements'),
          fetch('/api/reports?type=low-stock'),
        ])

        const [summaryJson, movementsJson, lowStockJson] = await Promise.all([
          summaryRes.json(),
          movementsRes.json(),
          lowStockRes.json(),
        ])

        const rawMovements = movementsJson.success ? movementsJson.data?.movements ?? [] : []
        const movements: MovementRow[] = rawMovements.map((m: { createdAt: string; type: 'IN' | 'OUT' | 'ADJUST'; quantity: number }) => ({
          date: m.createdAt.slice(0, 10),
          type: m.type,
          total: Number(m.quantity) || 0,
        }))

        setData({
          summary: summaryJson.success ? summaryJson.data : null,
          movements,
          lowStock: lowStockJson.success ? lowStockJson.data ?? [] : [],
          categories: summaryJson.success ? summaryJson.data?.byCategory ?? [] : [],
        })
      } catch (err) {
        console.error('Failed to load reports:', err)
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [])

  if (loading) return <Loading />

  const { summary, movements, lowStock, categories } = data

  return (
    <div className="px-4 py-4 space-y-6">
      <h1 className="text-lg font-bold text-gray-900">Reports</h1>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Items" value={summary.totalItems} />
          <StatCard
            label="Inventory Value"
            value={formatCurrency(summary.totalValue)}
          />
          <StatCard
            label="Low Stock"
            value={summary.lowStockCount}
            highlight={summary.lowStockCount > 0}
          />
          <StatCard label="Checked Out" value={summary.activeCheckouts} />
        </div>
      )}

      {/* Stock Movement Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 size={18} />
            Stock Movements (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StockChart data={movements} />
        </CardContent>
      </Card>

      {/* Low Stock Items */}
      {lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle size={18} />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="danger">{item.quantity} left</Badge>
                    {item.minQuantity !== null && (
                      <p className="mt-0.5 text-xs text-gray-400">min: {item.minQuantity}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Category */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <div key={cat.categoryName} className="flex items-center justify-between py-2.5">
                  <p className="text-sm font-medium text-gray-900">{cat.categoryName ?? 'Uncategorized'}</p>
                  <div className="text-right">
                    <p className="text-sm text-gray-700">{cat.count} items</p>
                    <p className="text-xs text-gray-400">{Number(cat.totalQuantity) || 0} total qty</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
