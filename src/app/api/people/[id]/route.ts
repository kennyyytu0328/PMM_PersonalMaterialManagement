import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { people, assets, assetEvents } from '@/db/schema'
import { updatePersonSchema } from '@/lib/validations'
import { eq, or } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const person = await db.query.people.findFirst({ where: eq(people.id, parseInt(id)) })

    if (!person) {
      return NextResponse.json({ success: false, error: 'Person not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: person })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch person' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const personId = parseInt(id)

    const existing = await db.query.people.findFirst({ where: eq(people.id, personId) })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Person not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updatePersonSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(people)
      .set(parsed.data)
      .where(eq(people.id, personId))
      .returning()

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update person' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const personId = parseInt(id)

    const existing = await db.query.people.findFirst({ where: eq(people.id, personId) })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Person not found' }, { status: 404 })
    }

    const [heldAsset, eventRef] = await Promise.all([
      db.query.assets.findFirst({ where: eq(assets.custodianId, personId) }),
      db.query.assetEvents.findFirst({
        where: or(
          eq(assetEvents.fromCustodianId, personId),
          eq(assetEvents.toCustodianId, personId)
        ),
      }),
    ])

    if (heldAsset || eventRef) {
      return NextResponse.json(
        { success: false, error: 'Person has asset history. Deactivate instead.' },
        { status: 400 }
      )
    }

    await db.delete(people).where(eq(people.id, personId))

    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete person' }, { status: 500 })
  }
}
