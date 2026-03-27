import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { categories } from '@/db/schema'
import { createCategorySchema } from '@/lib/validations'
import { asc } from 'drizzle-orm'

export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const allCategories = await db.query.categories.findMany({
      orderBy: asc(categories.name),
    })

    return NextResponse.json({ success: true, data: allCategories })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: admin only' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createCategorySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const [category] = await db.insert(categories).values(parsed.data).returning()

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 })
  }
}
