import { useMemo, useState } from 'react'
import { Search, ArrowUpDown } from 'lucide-react'
import type { BulkForecastItem } from '@/types'
import { formatConfidence, getTrendIcon, getTrendColor } from '@/lib/utils'

interface Props {
  forecasts: BulkForecastItem[]
  onSelectProduct: (productId: string) => void
  selectedId?: string | null
}

type UrgencyFilter = 'all' | 'high' | 'medium' | 'low'

export function ForecastTable({ forecasts, onSelectProduct, selectedId }: Props) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'urgency' | 'total_predicted_units' | 'confidence_score'>('urgency')
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all')

  const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }

  const filtered = useMemo(() => {
    return forecasts
      .filter((f) => f.product_name.toLowerCase().includes(search.toLowerCase()))
      .filter((f) => (urgencyFilter === 'all' ? true : f.urgency === urgencyFilter))
      .sort((a, b) => {
        if (sortKey === 'urgency') return (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3)
        return (b[sortKey] as number) - (a[sortKey] as number)
      })
  }, [forecasts, search, sortKey, urgencyFilter])

  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-ink-100 dark:border-white/10 flex flex-wrap items-center gap-3">
        <div>
          <h3 className="font-display text-base text-ink-900 dark:text-white">Assortment forecast</h3>
          <p className="text-xs text-ink-500 mt-0.5">{filtered.length} SKUs in view</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(['all', 'high', 'medium', 'low'] as UrgencyFilter[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUrgencyFilter(u)}
              className={`text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-colors ${
                urgencyFilter === u
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-ink-100 text-ink-500 hover:border-brand-200'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-ink-100 dark:border-white/10 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or product name…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-ink-100 dark:border-white/10 rounded-xl bg-ink-50/80 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <button
          onClick={() =>
            setSortKey(
              sortKey === 'urgency'
                ? 'total_predicted_units'
                : sortKey === 'total_predicted_units'
                  ? 'confidence_score'
                  : 'urgency',
            )
          }
          className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-700 px-3 py-2 border border-ink-100 rounded-xl"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortKey === 'urgency' ? 'Urgency' : sortKey === 'total_predicted_units' ? 'Demand' : 'Confidence'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 dark:border-white/10 bg-ink-50/50 dark:bg-white/5">
              {['SKU / Product', 'Predicted', 'Confidence', 'Trend', 'Days left', 'Priority'].map((h) => (
                <th key={h} className="text-left text-[11px] uppercase tracking-wider font-medium text-ink-500 px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr
                key={f.product_id}
                onClick={() => onSelectProduct(f.product_id)}
                className={`border-b border-ink-50 dark:border-white/5 hover:bg-brand-50/40 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                  selectedId === f.product_id ? 'bg-brand-50/70 dark:bg-brand-900/20' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-ink-900 dark:text-white">{f.product_name}</p>
                  <p className="text-[11px] font-mono text-ink-500 mt-0.5">{f.product_id}</p>
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-ink-700 dark:text-gray-300">
                  {Math.round(f.total_predicted_units).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-600 rounded-full"
                        style={{ width: `${f.confidence_score * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-ink-500">{formatConfidence(f.confidence_score)}</span>
                  </div>
                </td>
                <td className={`px-4 py-3 font-medium capitalize ${getTrendColor(f.trend_type)}`}>
                  {getTrendIcon(f.trend_type)} {f.trend_type.replace('_', ' ')}
                </td>
                <td className="px-4 py-3 font-mono text-ink-600 dark:text-gray-400">
                  {f.days_until_stockout != null ? `${f.days_until_stockout}d` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md ${
                    f.urgency === 'high' ? 'bg-rose-100 text-rose-700' :
                    f.urgency === 'medium' ? 'bg-amber-100 text-amber-800' :
                    'bg-teal-100 text-teal-800'
                  }`}>
                    {f.urgency}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-ink-500 py-10">No SKUs match the current filters.</p>
        )}
      </div>
    </div>
  )
}
