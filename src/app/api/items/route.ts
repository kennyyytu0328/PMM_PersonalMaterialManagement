import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { items, categories, locations } from '@/db/schema'
import { createItemSchema } from '@/lib/validations'
import { generateSku } from '@/lib/sku'
import { eq, and, like, or, asc, desc, count, max, SQL } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const categoryId = searchParams.get('categoryId')
    const locationId = searchParams.get('locationId')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const offset = (page - 1) * limit
    const sortBy = searchParams.get('sortBy') ?? 'name'
    const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc'

    const conditions: SQL[] = []

    if (search) {
      conditions.push(
        or(
          like(items.name, `%${search}%`),
          like(items.sku, `%${search}%`),
          like(items.barcode, `%${search}%`)
        ) as SQL
      )
    }

    if (categoryId) {
      conditions.push(eq(items.categoryId, parseInt(categoryId)))
    }

    if (locationId) {
      conditions.push(eq(items.locationId, parseInt(locationId)))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const sortColumn =
      sortBy === 'quantity' ? items.quantity :
      sortBy === 'createdAt' ? items.createdAt :
      sortBy === 'sku' ? items.sku :
      items.name

    const [allItems, [{ total }]] = await Promise.all([
      db.query.items.findMany({
        where,
        with: {
          category: true,
          location: true,
        },
        limit,
        offset,
        orderBy: sortDir === 'desc' ? desc(sortColumn) : asc(sortColumn),
      }),
      db.select({ total: count() }).from(items).where(where),
    ])

    return NextResponse.json({
      success: true,
      data: allItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch items' }, { status: 500 })
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
    const parsed = createItemSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const [{ maxId }] = await db.select({ maxId: max(items.id) }).from(items)
    const nextId = (maxId ?? 0) + 1
    const sku = generateSku(nextId)

    const [newItem] = await db
      .insert(items)
      .values({
        ...parsed.data,
        sku,
      })
      .returning()

    const item = await db.query.items.findFirst({
      where: eq(items.id, newItem.id),
      with: { category: true, location: true },
    })

    return NextResponse.json({ success: true, data: item }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create item' }, { status: 500 })
  }
}
