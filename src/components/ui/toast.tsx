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
              'flex items-center gap-2 rounded-lg p-3 text-sm font-medium shadow-lg',
              t.type === 'success' && 'bg-green-600 text-white',
              t.type === 'error' && 'bg-red-600 text-white'
            )}
          >
            {t.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
