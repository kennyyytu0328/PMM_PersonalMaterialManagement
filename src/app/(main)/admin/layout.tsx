import { AdminTabs } from '@/components/admin/admin-tabs'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs />
      {children}
    </div>
  )
}
