import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { items } from '@/db/schema'
import { eq, or } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const barcode = searchParams.get('barcode')
    const sku = searchParams.get('sku')

    if (!barcode && !sku) {
      return NextResponse.json(
        { success: false, error: 'Barcode or SKU parameter is required' },
        { status: 400 }
      )
    }

    let item = null

    if (barcode) {
      item = await db.query.items.findFirst({
        where: eq(items.barcode, barcode),
        with: { category: true, location: true },
      })
    }

    if (!item && sku) {
      item = await db.query.items.findFirst({
        where: eq(items.sku, sku),
        with: { category: true, location: true },
      })
    }

    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Scan lookup failed' }, { status: 500 })
  }
}
