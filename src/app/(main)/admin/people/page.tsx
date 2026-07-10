'use client'

import { useEffect, useState, useCallback } from 'react'
import { Contact, Plus, Trash2, Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/api'

interface Person {
  id: number
  name: string
  department: string | null
  email: string | null
  isActive: boolean
  createdAt: string
}

interface FormState {
  name: string
  department: string
  email: string
  isActive: boolean
}

const EMPTY_FORM: FormState = { name: '', department: '', email: '', isActive: true }

export default function PeoplePage() {
  const { toast } = useToast()
  const t = useTranslations('people')
  const tCommon = useTranslations('common')
  const [peopleList, setPeopleList] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchPeople = useCallback(async () => {
    try {
      const res = await apiFetch('/api/people')
      const json = await res.json()
      if (json.success) setPeopleList(json.data)
    } catch {
      toast(t('loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [toast, t])

  useEffect(() => {
    fetchPeople()
  }, [fetchPeople])

  const openAdd = () => {
    setEditingPerson(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (person: Person) => {
    setEditingPerson(person)
    setForm({
      name: person.name,
      department: person.department ?? '',
      email: person.email ?? '',
      isActive: person.isActive,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingPerson(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast(t('nameRequired'), 'error')
      return
    }

    setSaving(true)
    try {
      const isEdit = !!editingPerson
      const url = isEdit ? `/api/people/${editingPerson.id}` : '/api/people'
      const method = isEdit ? 'PUT' : 'POST'

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        department: form.department.trim() || null,
        email: form.email.trim() || null,
      }
      if (isEdit) {
        body.isActive = form.isActive
      }

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        toast(isEdit ? t('updated') : t('created'), 'success')
        closeModal()
        await fetchPeople()
      } else {
        toast(json.error ?? (isEdit ? t('updateFailed') : t('createFailed')), 'error')
      }
    } catch {
      toast(editingPerson ? t('updateFailed') : t('createFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (person: Person) => {
    if (!confirm(t('confirmDelete', { name: person.name }))) return
    try {
      const res = await apiFetch(`/api/people/${person.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast(t('deleted'), 'success')
        await fetchPeople()
      } else {
        toast(json.error ?? t('deleteFailed'), 'error')
      }
    } catch {
      toast(t('deleteFailed'), 'error')
    }
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">{t('title')}</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus size={16} className="mr-1" />
          {t('add')}
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : peopleList.length === 0 ? (
        <EmptyState
          icon={<Contact size={40} />}
          title={t('noPeople')}
          description={t('noPeopleDesc')}
          action={
            <Button size="sm" onClick={openAdd}>
              {t('add')}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {peopleList.map((person) => (
            <div key={person.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{person.name}</p>
                    {!person.isActive && <Badge variant="default">{t('inactive')}</Badge>}
                  </div>
                  {person.department && (
                    <p className="mt-0.5 text-sm text-gray-500">{person.department}</p>
                  )}
                  {person.email && <p className="mt-0.5 text-xs text-gray-400">{person.email}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(person)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(person)}
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

      <Modal open={modalOpen} onClose={closeModal} title={editingPerson ? t('modalEdit') : t('modalAdd')}>
        <div className="space-y-4">
          <Input
            id="person-name"
            label={t('nameLabel')}
            placeholder={t('namePlaceholder')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            id="person-department"
            label={t('departmentLabel')}
            placeholder={t('departmentPlaceholder')}
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <Input
            id="person-email"
            label={t('emailLabel')}
            type="email"
            placeholder={t('emailPlaceholder')}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {editingPerson && (
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              {t('activeLabel')}
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={closeModal}>
              {tCommon('cancel')}
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? (editingPerson ? t('saving') : t('creating')) : editingPerson ? t('save') : t('create')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
