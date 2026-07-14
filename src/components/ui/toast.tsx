'use client'

import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  toast: (message: string, type: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'animate-surface-in flex items-center gap-2.5 rounded-xl border bg-white p-3 text-sm font-medium text-gray-900 shadow-lg shadow-gray-950/5',
              t.type === 'success' && 'border-emerald-200',
              t.type === 'error' && 'border-red-200'
            )}
          >
            {t.type === 'success' ? (
              <CheckCircle size={18} className="shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-red-600" />
            )}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 transition-colors duration-150 ease-swift hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
