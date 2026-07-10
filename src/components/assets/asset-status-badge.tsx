import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  idle: 'default',
  in_use: 'success',
  repair: 'warning',
  lent_out: 'info',
  lost: 'danger',
  scrapped: 'default',
}

export function AssetStatusBadge({ status }: { status: string }) {
  const t = useTranslations('assets.status')
  return (
    <Badge
      variant={STATUS_VARIANT[status] ?? 'default'}
      className={status === 'scrapped' ? 'line-through opacity-70' : undefined}
    >
      {t(status)}
    </Badge>
  )
}
