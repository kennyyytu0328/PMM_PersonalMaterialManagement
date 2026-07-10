export function generateAssetNo(year: number, seq: number): string {
  return `AST-${year}-${String(seq).padStart(4, '0')}`
}

export function nextAssetSeq(existingAssetNos: string[], year: number): number {
  const pattern = new RegExp(`^AST-${year}-(\\d+)$`)
  const seqs = existingAssetNos
    .map((no) => pattern.exec(no))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => parseInt(m[1], 10))
  return seqs.length === 0 ? 1 : Math.max(...seqs) + 1
}
