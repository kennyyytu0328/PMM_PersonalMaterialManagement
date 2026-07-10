import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assets, assetEvents, scrapRequests } from '@/db/schema'
import { reviewScrapRequestSchema } from '@/lib/validations'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const requestId = parseInt(id)

    const scrapRequest = await db.query.scrapRequests.findFirst({
      where: eq(scrapRequests.id, requestId),
    })

    if (!scrapRequest) {
      return NextResponse.json(
        { success: false, error: 'Scrap request not found' },
        { status: 404 }
      )
    }

    if (scrapRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request already reviewed' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = reviewScrapRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { action, reviewNote } = parsed.data
    const now = new Date().toISOString()
    const reviewerId = parseInt((session.user as any).id)

    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, scrapRequest.assetId),
    })

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 })
    }

    if (action === 'approve') {
      await db
        .update(assets)
        .set({
          status: 'scrapped',
          custodianId: null,
          scrappedAt: now,
          scrapReason: scrapRequest.reason,
          updatedAt: now,
        })
        .where(eq(assets.id, asset.id))

      await db.insert(assetEvents).values({
        assetId: asset.id,
        type: 'SCRAP_APPROVED',
        fromCustodianId: asset.custodianId,
        fromStatus: asset.status,
        toStatus: 'scrapped',
        note: reviewNote,
        performedBy: reviewerId,
      })
    } else {
      await db.insert(assetEvents).values({
        assetId: asset.id,
        type: 'SCRAP_REJECTED',
        note: reviewNote,
        performedBy: reviewerId,
      })
    }

    const [updated] = await db
      .update(scrapRequests)
      .set({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: reviewerId,
        reviewNote,
        reviewedAt: now,
      })
      .where(eq(scrapRequests.id, requestId))
      .returning()

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to review scrap request' },
      { status: 500 }
    )
  }
}
