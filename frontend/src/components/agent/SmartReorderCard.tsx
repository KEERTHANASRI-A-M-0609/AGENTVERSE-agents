import { useState } from 'react'
import { AlertTriangle, CheckCircle2, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { BulkForecastItem, ProductResponse } from '@/types'
import { formatINR } from '@/lib/utils'

interface Props {
  item: BulkForecastItem
  product: ProductResponse | undefined
  onApprove: (item: BulkForecastItem) => Promise<void>
  onModify: (item: BulkForecastItem, qty: number) => Promise<void>
  approved?: boolean
}

function getReasoning(item: BulkForecastItem, prod: ProductResponse | undefined): string {
  const stock = prod?.current_stock ?? 0
  const days = item.days_until_stockout
  const trend = item.trend_type

  if (days != null && days <= 2) return `Only ${days} day(s) of stock left. At current sales velocity, you will run out before your next delivery arrives.`
  if (days != null && days <= 5) return `${days} days of stock remaining. With ${trend === 'upward' ? 'rising' : 'current'} demand, reorder now to cover the lead time gap.`
  if (trend === 'upward' || trend === 'seasonal_spike') return `Demand is accelerating. Stock of ${stock} units may not cover the upcoming forecast of ${Math.round(item.total_predicted_units)} units.`
  return `Forecast of ${Math.round(item.total_predicted_units)} units exceeds current stock of ${stock}. Reorder to maintain coverage for the forecast horizon.`
}

export function SmartReorderCard({ item, product, onApprove, onModify, approved }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [qty, setQty] = useState('')
  const [loading, setLoading] = useState(false)

  const recQty = Math.round(item.total_predicted_units * 1.2)
  const estCost = product ? Math.round((product.selling_price ?? 100) * 0.62 * recQty) : null
  const days = item.days_until_stockout
  const isCritical = days != null && days <= 3
  const reasoning = getReasoning(item, product)

  const doApprove = async () => {
    setLoading(true)
    await onApprove(item)
    setLoading(false)
  }

  const doModify = async () => {
    const n = parseInt(qty, 10)
    if (isNaN(n) || n <= 0) return
    setLoading(true)
    await onModify(item, n)
    setLoading(false)
    setEditing(false)
  }

  if (approved) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/5 border-b border-gray-100 dark:border-white/5">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{item.product_name}</span>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-500 ml-auto">Reorder approved</span>
      </div>
    )
  }

  return (
    <div className={`border-b border-gray-100 dark:border-white/5 ${isCritical ? 'bg-red-50/40 dark:bg-red-500/5' : ''}`}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Left: product info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.product_name}</span>
              {isCritical && <span className="badge-critical text-[9px]">Critical</span>}
              {!isCritical && item.urgency === 'high' && <span className="badge-attention text-[9px]">Urgent</span>}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Stock: {product?.current_stock ?? '?'} · Forecast: {Math.round(item.total_predicted_units)} units · {days != null ? `${days}d left` : 'reorder needed'}
            </p>
          </div>

          {/* Right: qty + cost */}
          <div className="shrink-0 text-right">
            <p className="text-xs font-bold font-mono text-gray-900 dark:text-white">Order {recQty} units</p>
            {estCost != null && <p className="text-[10px] text-emerald-600 dark:text-emerald-400">~{formatINR(estCost)} cost</p>}
          </div>
        </div>

        {/* AI reasoning — expandable */}
        <button onClick={() => setExpanded(v => !v)}
          className="mt-2 flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Hide reasoning' : 'Why does the AI recommend this?'}
        </button>

        {expanded && (
          <p className="mt-1.5 text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed bg-blue-50 dark:bg-blue-500/10 rounded px-2.5 py-2 border border-blue-100 dark:border-blue-500/20">
            {reasoning}
          </p>
        )}

        {/* Actions */}
        <div className="mt-2.5 flex items-center gap-2">
          {editing ? (
            <>
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder={recQty.toString()}
                className="w-16 px-2 py-1 text-xs border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#161b22] font-mono text-center outline-none focus:border-blue-500" />
              <button onClick={doModify} disabled={loading}
                className="text-[10px] px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold disabled:opacity-50">
                {loading ? '…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button onClick={doApprove} disabled={loading}
                className="text-[10px] px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded font-bold hover:opacity-90 disabled:opacity-50">
                {loading ? '…' : 'Approve'}
              </button>
              <button onClick={() => { setEditing(true); setQty(recQty.toString()) }}
                className="text-[10px] px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-white/5">
                Modify qty
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
