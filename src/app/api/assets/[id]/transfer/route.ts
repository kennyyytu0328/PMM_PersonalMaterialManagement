import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assets, assetEvents, people, scrapRequests } from '@/db/schema'
import { transferAssetSchema } from '@/lib/validations'
import { assetActionBlockReason, BLOCK_MESSAGES } from '@/lib/asset-guards'
import { eq, and } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
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
      return NextResponse.json({ success: false, error: BLOCK_MESSAGES[blocked] }, { status: 400 })
    }

    const body = await request.json()
    const parsed = transferAssetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { custodianId, note } = parsed.data

    if (custodianId === asset.custodianId) {
      return NextResponse.json(
        { success: false, error: 'Asset is already held by this person' },
        { status: 400 }
      )
    }

    const person = await db.query.people.findFirst({ where: eq(people.id, custodianId) })
    if (!person || !person.isActive) {
      return NextResponse.json(
        { success: false, error: 'Custodian not found or inactive' },
        { status: 400 }
      )
    }

    const newStatus = asset.status === 'idle' ? 'in_use' : asset.status
    const performedBy = parseInt((session.user as any).id)
    const updatedAt = new Date().toISOString()

    db.transaction((tx) => {
      tx.update(assets)
        .set({ custodianId, status: newStatus, updatedAt })
        .where(eq(assets.id, assetId))
        .run()

      tx.insert(assetEvents)
        .values({
          assetId,
          type: 'TRANSFER',
          fromCustodianId: asset.custodianId,
          toCustodianId: custodianId,
          fromStatus: asset.status,
          toStatus: newStatus,
          note,
          performedBy,
        })
        .run()
    })

    const updated = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
      with: { category: true, location: true, custodian: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to transfer asset' }, { status: 500 })
  }
}
