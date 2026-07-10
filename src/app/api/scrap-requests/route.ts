import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assets, assetEvents, scrapRequests } from '@/db/schema'
import { createScrapRequestSchema } from '@/lib/validations'
import { assetActionBlockReason } from '@/lib/asset-guards'
import { eq, and, desc, count, SQL } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const offset = (page - 1) * limit

    const conditions: SQL[] = []
    if (status) {
      conditions.push(
        eq(scrapRequests.status, status as (typeof scrapRequests.status.enumValues)[number])
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [requests, [{ total }]] = await Promise.all([
      db.query.scrapRequests.findMany({
        where,
        with: {
          asset: true,
          requester: { columns: { id: true, name: true } },
          reviewer: { columns: { id: true, name: true } },
        },
        limit,
        offset,
        orderBy: desc(scrapRequests.createdAt),
      }),
      db.select({ total: count() }).from(scrapRequests).where(where),
    ])

    return NextResponse.json({
      success: true,
      data: requests,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scrap requests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole === 'viewer') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createScrapRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { assetId, reason } = parsed.data

    const asset = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 })
    }

    const pending = await db.query.scrapRequests.findFirst({
      where: and(eq(scrapRequests.assetId, assetId), eq(scrapRequests.status, 'pending')),
    })

    const blocked = assetActionBlockReason(asset.status, !!pending)
    if (blocked === 'scrapped') {
      return NextResponse.json(
        { success: false, error: 'Asset is already scrapped' },
        { status: 400 }
      )
    }
    if (blocked === 'pendingScrap') {
      return NextResponse.json(
        { success: false, error: 'Asset already has a pending scrap request' },
        { status: 400 }
      )
    }

    const performedBy = parseInt((session.user as any).id)

    const [scrapRequest] = await db
      .insert(scrapRequests)
      .values({ assetId, reason, requestedBy: performedBy })
      .returning()

    await db.insert(assetEvents).values({
      assetId,
      type: 'SCRAP_REQUESTED',
      note: reason,
      performedBy,
    })

    return NextResponse.json({ success: true, data: scrapRequest }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create scrap request' },
      { status: 500 }
    )
  }
}
