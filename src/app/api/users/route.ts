import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { createUserSchema } from '@/lib/validations'
import { eq, count, asc } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function GET(_request: NextRequest) {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.name))

    return NextResponse.json({ success: true, data: allUsers })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 })
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
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10)

    const [{ userCount }] = await db.select({ userCount: count() }).from(users)
    const role = userCount === 0 ? 'admin' : parsed.data.role

    const [newUser] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })

    return NextResponse.json({ success: true, data: newUser }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 })
  }
}
