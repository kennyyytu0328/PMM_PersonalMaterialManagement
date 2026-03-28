'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'staff' | 'viewer'
  createdAt: string
}

interface FormState {
  name: string
  email: string
  password: string
  role: 'admin' | 'staff' | 'viewer'
}

const EMPTY_FORM: FormState = { name: '', email: '', password: '', role: 'staff' }

const ROLE_VARIANT: Record<string, 'danger' | 'info' | 'default'> = {
  admin: 'danger',
  staff: 'info',
  viewer: 'default',
}

export default function UsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      const json = await res.json()
      if (json.success) setUsers(json.data)
    } catch {
      toast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openAdd = () => {
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setForm({ name: user.name, email: user.email, password: '', role: user.role })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingUser(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Name is required', 'error')
      return
    }
    if (!form.email.trim()) {
      toast('Email is required', 'error')
      return
    }
    if (!editingUser && !form.password) {
      toast('Password is required', 'error')
      return
    }
    if (form.password && form.password.length < 8) {
      toast('Password must be at least 8 characters', 'error')
      return
    }

    setSaving(true)
    try {
      const isEdit = !!editingUser
      const url = isEdit ? `/api/users/${editingUser.id}` : '/api/users'
      const method = isEdit ? 'PUT' : 'POST'

      const body: Record<string, string> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      }
      if (form.password) {
        body.password = form.password
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        toast(isEdit ? 'User updated' : 'User created', 'success')
        closeModal()
        await fetchUsers()
      } else {
        toast(json.error ?? `Failed to ${isEdit ? 'update' : 'create'} user`, 'error')
      }
    } catch {
      toast(`Failed to ${editingUser ? 'update' : 'create'} user`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast('User deleted', 'success')
        await fetchUsers()
      } else {
        toast(json.error ?? 'Failed to delete', 'error')
      }
    } catch {
      toast('Failed to delete user', 'error')
    }
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Users</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus size={16} className="mr-1" />
          Add User
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title="No users"
          description="Add user accounts to allow access to the system."
          action={
            <Button size="sm" onClick={openAdd}>
              Add User
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <Badge variant={ROLE_VARIANT[user.role]}>{user.role}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">{user.email}</p>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(user.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(user)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editingUser ? 'Edit User' : 'Add User'}>
        <div className="space-y-4">
          <Input
            id="user-name"
            label="Name"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            id="user-email"
            label="Email"
            type="email"
            placeholder="user@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            id="user-password"
            label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
            type="password"
            placeholder={editingUser ? 'Leave blank to keep current' : 'Minimum 8 characters'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <div className="space-y-1">
            <label htmlFor="user-role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="user-role"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as FormState['role'] })
              }
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="viewer">Viewer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={closeModal}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? (editingUser ? 'Saving…' : 'Creating…') : (editingUser ? 'Save Changes' : 'Create User')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
