import { z } from 'zod'

export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  barcode: z.string().max(100).optional(),
  categoryId: z.number().int().positive().optional(),
  locationId: z.number().int().positive().optional(),
  quantity: z.number().int().min(0).default(0),
  minQuantity: z.number().int().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  unit: z.string().min(1).max(20).default('pcs'),
})

export const updateItemSchema = createItemSchema.partial()

export const createTransactionSchema = z.object({
  itemId: z.number().int().positive(),
  type: z.enum(['IN', 'OUT', 'ADJUST']),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  note: z.string().max(500).optional(),
})

export const createCheckoutSchema = z.object({
  itemId: z.number().int().positive(),
  userId: z.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be greater than 0').default(1),
  dueDate: z.string().optional(),
  note: z.string().max(500).optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'staff', 'viewer']).default('staff'),
})

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  parentId: z.number().int().positive().optional(),
})

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
})
