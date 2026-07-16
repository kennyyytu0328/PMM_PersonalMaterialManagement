import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

type CardSurface = 'white' | 'sky' | 'sage' | 'aqua' | 'ash'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: CardSurface
}

const surfaceClasses: Record<CardSurface, string> = {
  white: 'border border-mist bg-white',
  sky: 'bg-sky-card',
  sage: 'bg-sage-card',
  aqua: 'bg-aqua-card',
  ash: 'bg-ash-card',
}

export function Card({ className, surface = 'white', ...props }: CardProps) {
  return (
    <div className={cn('rounded-[20px] p-4', surfaceClasses[surface], className)} {...props} />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold tracking-tight text-charcoal', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-sm text-pewter', className)} {...props} />
}
