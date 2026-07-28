import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm text-gray-500 max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      )}
    </div>
  )
}
