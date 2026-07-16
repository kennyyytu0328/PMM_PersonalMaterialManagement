import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        {
          'bg-ash-card text-charcoal': variant === 'default',
          'bg-sage-card text-teal-ink': variant === 'success',
          'bg-peach-card text-amber-800': variant === 'warning',
          'bg-red-100 text-red-700': variant === 'danger',
          'bg-sky-card text-navy': variant === 'info',
        },
        className
      )}
      {...props}
    />
  )
}
