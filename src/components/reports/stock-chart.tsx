'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface MovementData {
  date: string
  type: 'IN' | 'OUT' | 'ADJUST'
  total: number
}

interface ChartDataPoint {
  date: string
  IN: number
  OUT: number
  ADJUST: number
}

interface StockChartProps {
  data: MovementData[]
}

function groupByDate(data: MovementData[]): ChartDataPoint[] {
  const map = new Map<string, ChartDataPoint>()

  for (const row of data) {
    const existing = map.get(row.date) ?? { date: row.date, IN: 0, OUT: 0, ADJUST: 0 }
    map.set(row.date, { ...existing, [row.type]: existing[row.type] + row.total })
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function StockChart({ data }: StockChartProps) {
  const chartData = groupByDate(data)

  if (chartData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        No movement data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="IN" name="Stock In" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="OUT" name="Stock Out" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="ADJUST" name="Adjusted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
