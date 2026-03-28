'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { KeyRound, User } from 'lucide-react'
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
  const [form, setForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM)
  const [saving, setSaving] = useState(false)

  const user = session?.user
  const role = (user as any)?.role ?? 'viewer'

  const handleChangePassword = async () => {
    if (!form.currentPassword) {
      toast('Current password is required', 'error')
      return
    }
    if (form.newPassword.length < 8) {
      toast('New password must be at least 8 characters', 'error')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      toast('New passwords do not match', 'error')
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
        toast('Password changed successfully', 'success')
        setForm(EMPTY_PASSWORD_FORM)
      } else {
        toast(json.error ?? 'Failed to change password', 'error')
      }
    } catch {
      toast('Failed to change password', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-bold text-gray-900">Profile</h1>

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <User size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{user?.name}</p>
              <Badge variant={ROLE_VARIANT[role]}>{role}</Badge>
            </div>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound size={20} className="text-gray-600" />
          <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
        </div>
        <div className="space-y-4">
          <Input
            id="current-password"
            label="Current Password"
            type="password"
            placeholder="Enter current password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
          <Input
            id="new-password"
            label="New Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
          <Input
            id="confirm-password"
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter new password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
          <Button className="w-full" onClick={handleChangePassword} disabled={saving}>
            {saving ? 'Changing Password...' : 'Change Password'}
          </Button>
        </div>
      </div>
    </div>
  )
}
