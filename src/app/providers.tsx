'use client'

import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/auth`}>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  )
}
