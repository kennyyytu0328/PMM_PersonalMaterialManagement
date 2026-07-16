'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { ReactNode, useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="animate-fade-in fixed inset-0 bg-charcoal/50" onClick={onClose} />
      <div
        className={cn(
          'animate-surface-in relative z-50 w-full max-w-md rounded-t-[24px] bg-white p-6 sm:rounded-[24px]',
          'max-h-[85vh] overflow-y-auto',
          className
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-pewter transition-colors duration-150 ease-swift hover:bg-ash-card hover:text-charcoal"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
