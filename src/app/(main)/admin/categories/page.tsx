'use client'

import { useEffect, useState, useCallback } from 'react'
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

interface Category {
  id: number
  name: string
  description: string | null
  createdAt: string
}

interface FormState {
  name: string
  description: string
}

const EMPTY_FORM: FormState = { name: '', description: '' }

export default function CategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      const json = await res.json()
      if (json.success) setCategories(json.data)
    } catch {
      toast('Failed to load categories', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description ?? '' })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Name is required', 'error')
      return
    }

    setSaving(true)
    try {
      const url = editing ? `/api/categories/${editing.id}` : '/api/categories'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast(editing ? 'Category updated' : 'Category created', 'success')
        closeModal()
        await fetchCategories()
      } else {
        toast(json.error ?? 'Failed to save', 'error')
      }
    } catch {
      toast('Failed to save category', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast('Category deleted', 'success')
        await fetchCategories()
      } else {
        toast(json.error ?? 'Failed to delete', 'error')
      }
    } catch {
      toast('Failed to delete category', 'error')
    }
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Categories</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus size={16} className="mr-1" />
          Add
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Tag size={40} />}
          title="No categories"
          description="Create categories to organise your inventory items."
          action={
            <Button size="sm" onClick={openAdd}>
              Add Category
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{cat.name}</p>
                  {cat.description && (
                    <p className="mt-0.5 text-sm text-gray-500">{cat.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">{formatDate(cat.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(cat)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
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

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Category' : 'Add Category'}
      >
        <div className="space-y-4">
          <Input
            id="cat-name"
            label="Name"
            placeholder="e.g. Electronics"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            id="cat-desc"
            label="Description (optional)"
            placeholder="Short description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={closeModal}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
