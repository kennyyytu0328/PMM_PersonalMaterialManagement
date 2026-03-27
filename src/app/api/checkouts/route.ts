import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { checkouts, items } from '@/db/schema'
import { createCheckoutSchema } from '@/lib/validations'
import { eq, isNull, desc, count, and, SQL } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const userId = searchParams.get('userId')
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const offset = (page - 1) * limit

    const conditions: SQL[] = []

    if (itemId) {
      conditions.push(eq(checkouts.itemId, parseInt(itemId)))
    }

    if (userId) {
      conditions.push(eq(checkouts.userId, parseInt(userId)))
    }

    if (activeOnly) {
      conditions.push(isNull(checkouts.returnedAt))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [allCheckouts, [{ total }]] = await Promise.all([
      db.query.checkouts.findMany({
        where,
        with: {
          item: true,
          user: {
            columns: { id: true, name: true, email: true, role: true, createdAt: true },
          },
        },
        limit,
        offset,
        orderBy: desc(checkouts.checkedOutAt),
      }),
      db.select({ total: count() }).from(checkouts).where(where),
    ])

    return NextResponse.json({
      success: true,
      data: allCheckouts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch checkouts' }, { status: 500 })
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
    const parsed = createCheckoutSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { itemId, userId, quantity, dueDate, note } = parsed.data

    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) })
    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
    }

    if (item.quantity < quantity) {
      return NextResponse.json(
        { success: false, error: `Insufficient stock. Available: ${item.quantity}` },
        { status: 400 }
      )
    }

    const [checkout] = await db
      .insert(checkouts)
      .values({
        itemId,
        userId,
        quantity,
        dueDate,
        note,
      })
      .returning()

    await db
      .update(items)
      .set({ quantity: item.quantity - quantity, updatedAt: new Date().toISOString() })
      .where(eq(items.id, itemId))

    const result = await db.query.checkouts.findFirst({
      where: eq(checkouts.id, checkout.id),
      with: {
        item: true,
        user: {
          columns: { id: true, name: true, email: true, role: true, createdAt: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create checkout' }, { status: 500 })
  }
}
