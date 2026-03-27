import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { items, transactions, checkouts, categories, locations } from '@/db/schema'
import { eq, isNull, isNotNull, lte, count, sum, sql, desc, and, gte } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') ?? 'summary'

    if (type === 'summary') {
      const [
        [{ totalItems }],
        allItems,
        [{ activeCheckouts }],
        categoryBreakdown,
        locationBreakdown,
      ] = await Promise.all([
        db.select({ totalItems: count() }).from(items),
        db.select({ quantity: items.quantity, unitCost: items.unitCost, minQuantity: items.minQuantity }).from(items),
        db.select({ activeCheckouts: count() }).from(checkouts).where(isNull(checkouts.returnedAt)),
        db
          .select({
            categoryId: items.categoryId,
            categoryName: categories.name,
            count: count(items.id),
            totalQuantity: sum(items.quantity),
          })
          .from(items)
          .leftJoin(categories, eq(items.categoryId, categories.id))
          .groupBy(items.categoryId, categories.name),
        db
          .select({
            locationId: items.locationId,
            locationName: locations.name,
            count: count(items.id),
            totalQuantity: sum(items.quantity),
          })
          .from(items)
          .leftJoin(locations, eq(items.locationId, locations.id))
          .groupBy(items.locationId, locations.name),
      ])

      const totalValue = allItems.reduce((sum, item) => {
        return sum + item.quantity * (item.unitCost ?? 0)
      }, 0)

      const lowStockCount = allItems.filter(
        (item) => item.minQuantity != null && item.quantity <= item.minQuantity
      ).length

      return NextResponse.json({
        success: true,
        data: {
          totalItems,
          totalValue,
          lowStockCount,
          activeCheckouts,
          byCategory: categoryBreakdown,
          byLocation: locationBreakdown,
        },
      })
    }

    if (type === 'movements') {
      const days = parseInt(searchParams.get('days') ?? '30')
      const since = new Date()
      since.setDate(since.getDate() - days)
      const sinceStr = since.toISOString()

      const movements = await db.query.transactions.findMany({
        where: gte(transactions.createdAt, sinceStr),
        with: {
          item: true,
          performer: {
            columns: { id: true, name: true, email: true, role: true, createdAt: true },
          },
        },
        orderBy: desc(transactions.createdAt),
        limit: 200,
      })

      const summary = await db
        .select({
          type: transactions.type,
          count: count(),
          totalQuantity: sum(transactions.quantity),
        })
        .from(transactions)
        .where(gte(transactions.createdAt, sinceStr))
        .groupBy(transactions.type)

      return NextResponse.json({
        success: true,
        data: { movements, summary, days },
      })
    }

    if (type === 'low-stock') {
      const lowStockItems = await db
        .select({
          id: items.id,
          name: items.name,
          sku: items.sku,
          quantity: items.quantity,
          minQuantity: items.minQuantity,
          unit: items.unit,
          categoryId: items.categoryId,
          locationId: items.locationId,
        })
        .from(items)
        .where(
          and(
            isNotNull(items.minQuantity),
            sql`${items.quantity} <= ${items.minQuantity}`
          )
        )
        .orderBy(items.quantity)

      return NextResponse.json({
        success: true,
        data: lowStockItems,
        meta: { total: lowStockItems.length },
      })
    }

    if (type === 'checkouts') {
      const activeOnly = searchParams.get('activeOnly') !== 'false'
      const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
      const offset = (page - 1) * limit

      const where = activeOnly ? isNull(checkouts.returnedAt) : undefined

      const [allCheckouts, [{ total }]] = await Promise.all([
        db.query.checkouts.findMany({
          where,
          with: {
            item: true,
            user: {
              columns: { id: true, name: true, email: true, role: true, createdAt: true },
            },
          },
          orderBy: desc(checkouts.checkedOutAt),
          limit,
          offset,
        }),
        db.select({ total: count() }).from(checkouts).where(where),
      ])

      return NextResponse.json({
        success: true,
        data: allCheckouts,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          activeOnly,
        },
      })
    }

    return NextResponse.json(
      { success: false, error: `Unknown report type: ${type}. Use: summary, movements, low-stock, checkouts` },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 })
  }
}
