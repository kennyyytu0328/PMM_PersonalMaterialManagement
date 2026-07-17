'use client'

import { useState } from 'react'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError(t('invalidCredentials'))
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="w-full max-w-sm rounded-[20px] border border-mist bg-white p-6">
      <div className="mb-8 text-center">
        <Image
          src="/gogo_fresh_mark.png"
          alt="Go Go Fresh"
          width={200}
          height={132}
          priority
          className="mx-auto h-20 w-auto"
        />
        <h1 className="sr-only">Go Go Fresh</h1>
        <p className="mt-3 text-sm text-pewter">{t('subtitle')}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-[20px] bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        <Input
          id="email"
          label={t('emailLabel')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          required
        />
        <Input
          id="password"
          label={t('passwordLabel')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('passwordPlaceholder')}
          required
        />
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? t('signingIn') : t('signIn')}
        </Button>
      </form>
    </div>
  )
}
