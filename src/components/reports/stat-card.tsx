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
      className={`rounded-[20px] border p-4 ${highlight ? 'border-red-200 bg-red-50' : 'border-mist bg-white'}`}
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${highlight ? 'text-red-600' : 'text-pewter'}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${highlight ? 'text-red-700' : 'text-navy'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-pewter/80">{sub}</p>}
      {warning && <p className="mt-0.5 text-xs font-medium text-amber-600">{warning}</p>}
    </div>
  )
}
