import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assetEvents } from '@/db/schema'
import { eq, desc, count, SQL, and } from 'drizzle-orm'

const EVENT_TYPES = [
  'REGISTER',
  'TRANSFER',
  'STATUS_CHANGE',
  'SCRAP_REQUESTED',
  'SCRAP_APPROVED',
  'SCRAP_REJECTED',
] as const

type AssetEventType = (typeof EVENT_TYPES)[number]

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')
    const type = searchParams.get('type')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const offset = (page - 1) * limit

    const conditions: SQL[] = []

    if (assetId) {
      conditions.push(eq(assetEvents.assetId, parseInt(assetId)))
    }

    if (type && (EVENT_TYPES as readonly string[]).includes(type)) {
      conditions.push(eq(assetEvents.type, type as AssetEventType))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [events, [{ total }]] = await Promise.all([
      db.query.assetEvents.findMany({
        where,
        with: {
          asset: true,
          fromCustodian: true,
          toCustodian: true,
          performer: {
            columns: { id: true, name: true, email: true, role: true, createdAt: true },
          },
        },
        limit,
        offset,
        orderBy: desc(assetEvents.createdAt),
      }),
      db.select({ total: count() }).from(assetEvents).where(where),
    ])

    return NextResponse.json({
      success: true,
      data: events,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch asset events' },
      { status: 500 }
    )
  }
}
