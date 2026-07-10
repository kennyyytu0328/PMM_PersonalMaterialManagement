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

export const createPersonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  department: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
})

export const updatePersonSchema = createPersonSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const createAssetSchema = z.object({
  assetNo: z.string().min(1).max(50).optional(),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.number().int().positive().optional(),
  locationId: z.number().int().positive().optional(),
  custodianId: z.number().int().positive().optional(),
  acquiredAt: z.string().max(30).optional(),
  cost: z.number().min(0).optional(),
  vendor: z.string().max(200).optional(),
  barcode: z.string().max(100).optional(),
})

export const updateAssetSchema = createAssetSchema.partial()

export const transferAssetSchema = z.object({
  custodianId: z.number().int().positive(),
  note: z.string().max(500).optional(),
})

export const changeAssetStatusSchema = z.object({
  status: z.enum(['idle', 'in_use', 'repair', 'lent_out', 'lost']),
  note: z.string().max(500).optional(),
})

export const createScrapRequestSchema = z.object({
  assetId: z.number().int().positive(),
  reason: z.string().min(1, 'Reason is required').max(500),
})

export const reviewScrapRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNote: z.string().max(500).optional(),
})
