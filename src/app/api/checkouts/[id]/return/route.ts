import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { checkouts, items } from '@/db/schema'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
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
    const checkoutId = parseInt(id)
    if (isNaN(checkoutId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 })
    }

    const checkout = await db.query.checkouts.findFirst({
      where: eq(checkouts.id, checkoutId),
      with: { item: true },
    })

    if (!checkout) {
      return NextResponse.json({ success: false, error: 'Checkout not found' }, { status: 404 })
    }

    if (checkout.returnedAt) {
      return NextResponse.json(
        { success: false, error: 'Item already returned' },
        { status: 400 }
      )
    }

    const returnedAt = new Date().toISOString()

    await db
      .update(checkouts)
      .set({ returnedAt })
      .where(eq(checkouts.id, checkoutId))

    await db
      .update(items)
      .set({
        quantity: checkout.item.quantity + checkout.quantity,
        updatedAt: returnedAt,
      })
      .where(eq(items.id, checkout.itemId))

    const result = await db.query.checkouts.findFirst({
      where: eq(checkouts.id, checkoutId),
      with: {
        item: true,
        user: {
          columns: { id: true, name: true, email: true, role: true, createdAt: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to process return' }, { status: 500 })
  }
}
