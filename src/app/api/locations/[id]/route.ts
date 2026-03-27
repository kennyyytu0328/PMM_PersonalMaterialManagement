import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { locations } from '@/db/schema'
import { createLocationSchema } from '@/lib/validations'
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
    const locationId = parseInt(id)
    if (isNaN(locationId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 })
    }

    const existing = await db.query.locations.findFirst({ where: eq(locations.id, locationId) })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = createLocationSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(locations)
      .set(parsed.data)
      .where(eq(locations.id, locationId))
      .returning()

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update location' }, { status: 500 })
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
    const locationId = parseInt(id)
    if (isNaN(locationId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 })
    }

    const existing = await db.query.locations.findFirst({ where: eq(locations.id, locationId) })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 })
    }

    await db.delete(locations).where(eq(locations.id, locationId))

    return NextResponse.json({ success: true, data: { id: locationId } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete location' }, { status: 500 })
  }
}
