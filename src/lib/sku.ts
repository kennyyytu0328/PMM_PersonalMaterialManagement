export function generateSku(id: number): string {
  return `PMM-${String(id).padStart(5, '0')}`
}
