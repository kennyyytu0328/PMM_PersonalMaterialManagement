export const ASSET_STATUSES = [
  'idle',
  'in_use',
  'repair',
  'lent_out',
  'lost',
  'scrapped',
] as const

export type AssetStatus = (typeof ASSET_STATUSES)[number]

export function assetActionBlockReason(
  status: string,
  hasPendingScrap: boolean
): 'scrapped' | 'pendingScrap' | null {
  if (status === 'scrapped') return 'scrapped'
  if (hasPendingScrap) return 'pendingScrap'
  return null
}
