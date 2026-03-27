import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { users } from '@/db/schema'
import { createUserSchema } from '@/lib/validations'
import { eq, count } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
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

    // First user becomes admin
    const [{ value: userCount }] = await db.select({ value: count() }).from(users)
    const role = userCount === 0 ? 'admin' : parsed.data.role

    const [newUser] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role,
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    )
  }
}
