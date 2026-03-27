import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { categories } from '@/db/schema'
import { createCategorySchema } from '@/lib/validations'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: admin only' }, { status: 403 })
    }

    const { id } = await params
    const categoryId = parseInt(id)
    if (isNaN(categoryId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 })
    }

    const existing = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = createCategorySchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(categories)
      .set(parsed.data)
      .where(eq(categories.id, categoryId))
      .returning()

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: admin only' }, { status: 403 })
    }

    const { id } = await params
    const categoryId = parseInt(id)
    if (isNaN(categoryId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 })
    }

    const existing = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }

    await db.delete(categories).where(eq(categories.id, categoryId))

    return NextResponse.json({ success: true, data: { id: categoryId } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete category' }, { status: 500 })
  }
}
