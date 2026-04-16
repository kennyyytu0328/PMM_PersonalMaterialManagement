'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { KeyRound, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const ROLE_VARIANT: Record<string, 'danger' | 'info' | 'default'> = {
  admin: 'danger',
  staff: 'info',
  viewer: 'default',
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const t = useTranslations('profile')
  const tRoles = useTranslations('profile.roles')
  const [form, setForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM)
  const [saving, setSaving] = useState(false)

  const user = session?.user
  const role = (user as any)?.role ?? 'viewer'

  const handleChangePassword = async () => {
    if (!form.currentPassword) {
      toast(t('currentRequired'), 'error')
      return
    }
    if (form.newPassword.length < 8) {
      toast(t('newMinLength'), 'error')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      toast(t('mismatchError'), 'error')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast(t('changedSuccess'), 'success')
        setForm(EMPTY_PASSWORD_FORM)
      } else {
        toast(json.error ?? t('changeFailed'), 'error')
      }
    } catch {
      toast(t('changeFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-bold text-gray-900">{t('title')}</h1>

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <User size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{user?.name}</p>
              <Badge variant={ROLE_VARIANT[role]}>{tRoles(role as 'admin' | 'staff' | 'viewer')}</Badge>
            </div>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound size={20} className="text-gray-600" />
          <h2 className="text-base font-semibold text-gray-900">{t('changePasswordHeader')}</h2>
        </div>
        <div className="space-y-4">
          <Input
            id="current-password"
            label={t('currentPasswordLabel')}
            type="password"
            placeholder={t('currentPasswordPlaceholder')}
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
          <Input
            id="new-password"
            label={t('newPasswordLabel')}
            type="password"
            placeholder={t('newPasswordPlaceholder')}
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
          <Input
            id="confirm-password"
            label={t('confirmNewPasswordLabel')}
            type="password"
            placeholder={t('confirmNewPasswordPlaceholder')}
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
          <Button className="w-full" onClick={handleChangePassword} disabled={saving}>
            {saving ? t('changing') : t('submit')}
          </Button>
        </div>
      </div>
    </div>
  )
}
