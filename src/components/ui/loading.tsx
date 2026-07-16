export function Loading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-mist border-t-teal" />
      <p className="mt-3 text-sm text-pewter">{text}</p>
    </div>
  )
}
