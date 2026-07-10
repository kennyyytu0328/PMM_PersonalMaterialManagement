import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { people } from '@/db/schema'
import { createPersonSchema } from '@/lib/validations'
import { asc, eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const allPeople = await db.query.people.findMany({
      where: activeOnly ? eq(people.isActive, true) : undefined,
      orderBy: asc(people.name),
    })

    return NextResponse.json({ success: true, data: allPeople })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch people' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createPersonSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const [person] = await db.insert(people).values(parsed.data).returning()

    return NextResponse.json({ success: true, data: person }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create person' }, { status: 500 })
  }
}
