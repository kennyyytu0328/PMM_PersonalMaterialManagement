import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assets, assetEvents } from '@/db/schema'
import { createAssetSchema } from '@/lib/validations'
import { generateAssetNo, nextAssetSeq } from '@/lib/asset-no'
import { eq, and, like, or, desc, count, SQL } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status')
    const custodianId = searchParams.get('custodianId')
    const categoryId = searchParams.get('categoryId')
    const locationId = searchParams.get('locationId')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const offset = (page - 1) * limit

    const conditions: SQL[] = []

    if (search) {
      conditions.push(
        or(
          like(assets.name, `%${search}%`),
          like(assets.assetNo, `%${search}%`),
          like(assets.barcode, `%${search}%`)
        ) as SQL
      )
    }

    if (status) conditions.push(eq(assets.status, status as (typeof assets.status.enumValues)[number]))
    if (custodianId) conditions.push(eq(assets.custodianId, parseInt(custodianId)))
    if (categoryId) conditions.push(eq(assets.categoryId, parseInt(categoryId)))
    if (locationId) conditions.push(eq(assets.locationId, parseInt(locationId)))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [allAssets, [{ total }]] = await Promise.all([
      db.query.assets.findMany({
        where,
        with: { category: true, location: true, custodian: true },
        limit,
        offset,
        orderBy: desc(assets.createdAt),
      }),
      db.select({ total: count() }).from(assets).where(where),
    ])

    return NextResponse.json({
      success: true,
      data: allAssets,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch assets' }, { status: 500 })
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
    const parsed = createAssetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const existing = await db.select({ assetNo: assets.assetNo }).from(assets)

    let assetNo = parsed.data.assetNo
    if (assetNo) {
      if (existing.some((a) => a.assetNo === assetNo)) {
        return NextResponse.json(
          { success: false, error: 'Asset number already exists' },
          { status: 400 }
        )
      }
    } else {
      const year = new Date().getFullYear()
      assetNo = generateAssetNo(
        year,
        nextAssetSeq(
          existing.map((a) => a.assetNo),
          year
        )
      )
    }

    const status = parsed.data.custodianId ? 'in_use' : 'idle'

    const [newAsset] = await db
      .insert(assets)
      .values({ ...parsed.data, assetNo, status })
      .returning()

    await db.insert(assetEvents).values({
      assetId: newAsset.id,
      type: 'REGISTER',
      toCustodianId: parsed.data.custodianId,
      toStatus: status,
      performedBy: parseInt((session.user as any).id),
    })

    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, newAsset.id),
      with: { category: true, location: true, custodian: true },
    })

    return NextResponse.json({ success: true, data: asset }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create asset' }, { status: 500 })
  }
}
