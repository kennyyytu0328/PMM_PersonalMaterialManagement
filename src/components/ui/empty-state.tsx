import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 text-teal-soft">{icon}</div>
      <h3 className="text-lg font-medium text-charcoal">{title}</h3>
      <p className="mt-1 text-sm text-pewter">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
