import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { locations } from '@/db/schema'
import { createLocationSchema } from '@/lib/validations'
import { asc } from 'drizzle-orm'

export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const allLocations = await db.query.locations.findMany({
      orderBy: asc(locations.name),
    })

    return NextResponse.json({ success: true, data: allLocations })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch locations' }, { status: 500 })
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
    const parsed = createLocationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const [location] = await db.insert(locations).values(parsed.data).returning()

    return NextResponse.json({ success: true, data: location }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create location' }, { status: 500 })
  }
}
