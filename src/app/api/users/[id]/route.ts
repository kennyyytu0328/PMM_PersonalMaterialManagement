import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

type Params = { params: Promise<{ id: string }> }

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'staff', 'viewer']).optional(),
})

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
    const userId = parseInt(id)
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 })
    }

    const existing = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const updateData: Partial<typeof users.$inferInsert> = {}
    if (parsed.data.name) updateData.name = parsed.data.name
    if (parsed.data.email) updateData.email = parsed.data.email
    if (parsed.data.role) updateData.role = parsed.data.role
    if (parsed.data.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10)
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 })
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
    const userId = parseInt(id)
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 })
    }

    const currentUserId = parseInt((session.user as any).id)
    if (userId === currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const existing = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    await db.delete(users).where(eq(users.id, userId))

    return NextResponse.json({ success: true, data: { id: userId } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 })
  }
}
