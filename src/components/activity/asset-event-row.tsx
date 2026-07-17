'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export interface AssetEventEntry {
  id: number
  assetId: number
  type:
    | 'REGISTER'
    | 'TRANSFER'
    | 'STATUS_CHANGE'
    | 'SCRAP_REQUESTED'
    | 'SCRAP_APPROVED'
    | 'SCRAP_REJECTED'
  fromStatus: string | null
  toStatus: string | null
  note: string | null
  createdAt: string
  asset?: { id: number; name: string; assetNo: string }
  fromCustodian?: { id: number; name: string } | null
  toCustodian?: { id: number; name: string } | null
  performer?: { id: number; name: string }
}

const EVENT_VARIANT: Record<
  AssetEventEntry['type'],
  'default' | 'success' | 'warning' | 'danger' | 'info'
> = {
  REGISTER: 'info',
  TRANSFER: 'info',
  STATUS_CHANGE: 'default',
  SCRAP_REQUESTED: 'warning',
  SCRAP_APPROVED: 'danger',
  SCRAP_REJECTED: 'default',
}

export function AssetEventRow({ event }: { event: AssetEventEntry }) {
  const t = useTranslations('activity')
  const tEvents = useTranslations('assetDetail.events')
  const tStatus = useTranslations('assets.status')

  const context =
    event.type === 'TRANSFER'
      ? `${event.fromCustodian?.name ?? '—'} → ${event.toCustodian?.name ?? '—'}`
      : event.type === 'STATUS_CHANGE' && event.fromStatus && event.toStatus
        ? `${tStatus(event.fromStatus)} → ${tStatus(event.toStatus)}`
        : null

  return (
    <Link
      href={`/assets/${event.assetId}`}
      className="flex items-start gap-3 rounded-[20px] border border-mist bg-white p-4"
    >
      <Badge variant={EVENT_VARIANT[event.type]} className="mt-0.5 shrink-0 bg-sky-card text-navy">
        {tEvents(event.type)}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">
          {event.asset?.name ?? t('unknownAsset')}
        </p>
        <p className="text-xs text-pewter/70">{event.asset?.assetNo}</p>
        {context && <p className="mt-0.5 text-xs text-pewter">{context}</p>}
        {event.note && <p className="mt-0.5 text-xs text-pewter">{event.note}</p>}
        <p className="mt-1 text-xs text-pewter/70">
          {t('by')} {event.performer?.name ?? t('unknownPerformer')} · {formatDate(event.createdAt)}
        </p>
      </div>
    </Link>
  )
}
