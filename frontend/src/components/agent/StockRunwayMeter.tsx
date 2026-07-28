import type { BulkForecastItem } from '@/types'
import type { ProductResponse } from '@/types'

interface Props {
  portfolio: BulkForecastItem[]
  products: Record<string, ProductResponse>
  onSelect: (item: BulkForecastItem) => void
}

function RunwayBar({ days, max }: { days: number; max: number }) {
  const pct = Math.min(100, (days / max) * 100)
  const color =
    days <= 3 ? 'bg-red-500' :
    days <= 7 ? 'bg-amber-500' :
    days <= 14 ? 'bg-yellow-400' :
    'bg-emerald-500'
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-mono font-bold w-10 text-right shrink-0 ${
        days <= 3 ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-gray-600 dark:text-gray-400'
      }`}>
        {days}d
      </span>
    </div>
  )
}

export function StockRunwayMeter({ portfolio, products, onSelect }: Props) {
  const items = portfolio
    .filter(i => i.days_until_stockout != null)
    .sort((a, b) => (a.days_until_stockout ?? 99) - (b.days_until_stockout ?? 99))
    .slice(0, 8)

  const maxDays = Math.max(...items.map(i => i.days_until_stockout ?? 0), 30)

  if (!items.length) return (
    <div className="flex items-center justify-center h-24 text-xs text-gray-400">
      All products have sufficient stock runway.
    </div>
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
        <span>Product</span>
        <span>Stock runway (days until stockout)</span>
      </div>
      {items.map(item => {
        const prod = products[item.product_id]
        const days = item.days_until_stockout ?? 0
        return (
          <button key={item.product_id} onClick={() => onSelect(item)}
            className="w-full flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded px-1 py-1 transition-colors group text-left">
            <div className="w-28 shrink-0">
              <p className="text-[11px] font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {item.product_name}
              </p>
              <p className="text-[9px] text-gray-400 font-mono">
                {prod?.current_stock ?? '?'} in stock
              </p>
            </div>
            <RunwayBar days={days} max={maxDays} />
          </button>
        )
      })}
      <div className="flex items-center gap-4 pt-1 text-[9px] text-gray-400">
        <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded bg-red-500 inline-block" /> ≤3d critical</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded bg-amber-500 inline-block" /> ≤7d warning</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded bg-emerald-500 inline-block" /> safe</span>
      </div>
    </div>
  )
}
