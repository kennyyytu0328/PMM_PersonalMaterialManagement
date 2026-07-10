import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assets, scrapRequests } from '@/db/schema'
import { updateAssetSchema } from '@/lib/validations'
import { assetActionBlockReason, BLOCK_MESSAGES } from '@/lib/asset-guards'
import { eq, and, ne, desc } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const assetId = parseInt(id)

    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
      with: {
        category: true,
        location: true,
        custodian: true,
        events: {
          with: {
            performer: { columns: { id: true, name: true } },
            fromCustodian: true,
            toCustodian: true,
          },
          orderBy: (events, { desc: descFn }) => [descFn(events.createdAt), descFn(events.id)],
        },
      },
    })

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 })
    }

    const pendingScrapRequest = await db.query.scrapRequests.findFirst({
      where: and(eq(scrapRequests.assetId, assetId), eq(scrapRequests.status, 'pending')),
    })

    return NextResponse.json({
      success: true,
      data: { ...asset, pendingScrapRequest: pendingScrapRequest ?? null },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch asset' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole === 'viewer') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const assetId = parseInt(id)

    const asset = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 })
    }

    const pending = await db.query.scrapRequests.findFirst({
      where: and(eq(scrapRequests.assetId, assetId), eq(scrapRequests.status, 'pending')),
    })

    const blocked = assetActionBlockReason(asset.status, !!pending)
    if (blocked) {
      return NextResponse.json(
        { success: false, error: BLOCK_MESSAGES[blocked] },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = updateAssetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    if (parsed.data.assetNo) {
      const conflict = await db.query.assets.findFirst({
        where: and(eq(assets.assetNo, parsed.data.assetNo), ne(assets.id, assetId)),
      })
      if (conflict) {
        return NextResponse.json(
          { success: false, error: 'Asset number already exists' },
          { status: 400 }
        )
      }
    }

    await db
      .update(assets)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(eq(assets.id, assetId))

    const updated = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
      with: { category: true, location: true, custodian: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update asset' }, { status: 500 })
  }
}
