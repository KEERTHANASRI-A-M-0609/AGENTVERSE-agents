import { TrendingUp, TrendingDown } from 'lucide-react'
import type { BulkForecastItem } from '@/types'

interface Props {
  forecasts: BulkForecastItem[]
  onSelectProduct?: (productId: string) => void
}

export function TopMoversPanel({ forecasts, onSelectProduct }: Props) {
  const increasing = forecasts.filter((f) => ['upward', 'seasonal_spike'].includes(f.trend_type)).slice(0, 4)
  const decreasing = forecasts.filter((f) => f.trend_type === 'downward').slice(0, 4)

  const Row = ({ item, type }: { item: BulkForecastItem; type: 'up' | 'down' }) => (
    <button
      type="button"
      onClick={() => onSelectProduct?.(item.product_id)}
      className="w-full flex items-center justify-between py-2.5 border-b border-ink-50 dark:border-white/5 last:border-0 text-left hover:bg-brand-50/40 rounded-lg px-1 transition-colors"
    >
      <span className="text-sm text-ink-700 dark:text-gray-300 truncate max-w-[60%]">{item.product_name}</span>
      <div className="flex items-center gap-1.5">
        {type === 'up'
          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          : <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
        <span className={`text-xs font-mono font-medium ${type === 'up' ? 'text-emerald-700' : 'text-rose-600'}`}>
          {Math.round(item.total_predicted_units)}
        </span>
      </div>
    </button>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="panel p-5">
        <h3 className="font-display text-base text-ink-900 dark:text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" /> Rising demand
        </h3>
        {increasing.length > 0
          ? increasing.map((f) => <Row key={f.product_id} item={f} type="up" />)
          : <p className="text-xs text-ink-500 py-4 text-center">No rising trends in this horizon</p>}
      </div>
      <div className="panel p-5">
        <h3 className="font-display text-base text-ink-900 dark:text-white mb-3 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-500" /> Softening demand
        </h3>
        {decreasing.length > 0
          ? decreasing.map((f) => <Row key={f.product_id} item={f} type="down" />)
          : <p className="text-xs text-ink-500 py-4 text-center">No declining trends in this horizon</p>}
      </div>
    </div>
  )
}
