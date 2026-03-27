import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { transactions, items } from '@/db/schema'
import { createTransactionSchema } from '@/lib/validations'
import { eq, desc, count, asc, SQL, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const type = searchParams.get('type')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const offset = (page - 1) * limit

    const conditions: SQL[] = []

    if (itemId) {
      conditions.push(eq(transactions.itemId, parseInt(itemId)))
    }

    if (type && ['IN', 'OUT', 'ADJUST'].includes(type)) {
      conditions.push(eq(transactions.type, type as 'IN' | 'OUT' | 'ADJUST'))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [allTransactions, [{ total }]] = await Promise.all([
      db.query.transactions.findMany({
        where,
        with: {
          item: true,
          performer: {
            columns: { id: true, name: true, email: true, role: true, createdAt: true },
          },
        },
        limit,
        offset,
        orderBy: desc(transactions.createdAt),
      }),
      db.select({ total: count() }).from(transactions).where(where),
    ])

    return NextResponse.json({
      success: true,
      data: allTransactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 })
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
    const parsed = createTransactionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { itemId, type, quantity, note } = parsed.data

    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) })
    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
    }

    let newQuantity: number

    if (type === 'IN') {
      newQuantity = item.quantity + quantity
    } else if (type === 'OUT') {
      if (item.quantity < quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock. Available: ${item.quantity}` },
          { status: 400 }
        )
      }
      newQuantity = item.quantity - quantity
    } else {
      // ADJUST
      newQuantity = quantity
    }

    const userId = parseInt((session.user as any).id)

    const [transaction] = await db
      .insert(transactions)
      .values({
        itemId,
        type,
        quantity,
        note,
        performedBy: userId,
      })
      .returning()

    await db
      .update(items)
      .set({ quantity: newQuantity, updatedAt: new Date().toISOString() })
      .where(eq(items.id, itemId))

    const result = await db.query.transactions.findFirst({
      where: eq(transactions.id, transaction.id),
      with: {
        item: true,
        performer: {
          columns: { id: true, name: true, email: true, role: true, createdAt: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create transaction' }, { status: 500 })
  }
}
