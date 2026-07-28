import { PackageSearch } from 'lucide-react'

export function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <PackageSearch className="w-10 h-10 text-gray-300" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}
