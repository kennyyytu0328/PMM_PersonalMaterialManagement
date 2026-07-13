interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  warning?: string
  highlight?: boolean
}

export function StatCard({ label, value, sub, warning, highlight }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${highlight ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${highlight ? 'text-red-500' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      {warning && <p className="mt-0.5 text-xs font-medium text-amber-600">{warning}</p>}
    </div>
  )
}
