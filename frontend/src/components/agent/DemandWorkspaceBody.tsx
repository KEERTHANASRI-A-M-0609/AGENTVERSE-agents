import { useState, useMemo } from 'react'
import type { BulkForecastItem, DashboardResponse, ProductResponse } from '@/types'
import { AlertTriangle, TrendingUp, DollarSign, Truck, CheckCircle2, Clock, Package, X, ChevronRight } from 'lucide-react'
import { formatINR } from '@/lib/utils'

interface Props {
  data: DashboardResponse
  products: Record<string, ProductResponse>
  onSelect: (productId: string) => void
  onOpenDrawer: (product: ProductResponse, forecast: BulkForecastItem) => void
  onReorderAction?: (productId: string, action: 'accepted' | 'modified', quantity?: number) => Promise<any>
}

// Convert days_until_stockout to a human time like "by 11:40 AM" or "in 2 days"
function stockoutTime(days: number | null, leadDays: number): { label: string; deliveryLabel: string } {
  if (days == null) return { label: 'soon', deliveryLabel: `in ${leadDays} day${leadDays !== 1 ? 's' : ''}` }
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24))
    const now = new Date()
    now.setHours(now.getHours() + hours)
    const t = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    return { label: `by ${t} today`, deliveryLabel: 'tomorrow morning' }
  }
  if (days === 1) return { label: 'tomorrow', deliveryLabel: `in ${leadDays} day${leadDays !== 1 ? 's' : ''}` }
  return { label: `in ${days} days`, deliveryLabel: `in ${leadDays} day${leadDays !== 1 ? 's' : ''}` }
}

function lostRevenue(item: BulkForecastItem, prod: ProductResponse | undefined): number {
  const price = prod?.selling_price ?? 100
  const dailyDemand = item.total_predicted_units / 7
  return Math.round(dailyDemand * price * 3) // 3 days of lost sales if ignored
}

function urgencyColor(item: BulkForecastItem) {
  if (item.urgency === 'high' && (item.days_until_stockout ?? 99) <= 1) return 'red'
  if (item.urgency === 'high') return 'orange'
  if (item.urgency === 'medium') return 'amber'
  return 'green'
}

export function DemandWorkspaceBody({ data, products, onSelect, onOpenDrawer, onReorderAction }: Props) {
  const portfolio = data.portfolio?.length ? data.portfolio : data.top_reorder_products
  const [processed, setProcessed] = useState<Record<string, 'ordered' | 'snoozed'>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [customQty, setCustomQty] = useState('')

  // Items that need action — sorted by urgency
  const actionItems = useMemo(() =>
    portfolio
      .filter(i => i.reorder_required && !processed[i.product_id])
      .sort((a, b) => (a.days_until_stockout ?? 99) - (b.days_until_stockout ?? 99)),
    [portfolio, processed]
  )

  // Rising demand items (not stockout, just trending up)
  const risingItems = useMemo(() =>
    portfolio.filter(i =>
      (i.trend_type === 'upward' || i.trend_type === 'seasonal_spike') &&
      !i.reorder_required
    ).slice(0, 3),
    [portfolio]
  )

  // All-good items
  const healthyCount = portfolio.filter(i => i.urgency === 'low' && !i.reorder_required).length

  const handleOrder = async (productId: string, qty: number) => {
    if (onReorderAction) await onReorderAction(productId, 'accepted', qty)
    setProcessed(p => ({ ...p, [productId]: 'ordered' }))
    setEditingId(null)
  }

  const handleModify = async (productId: string) => {
    const qty = parseInt(customQty, 10)
    if (isNaN(qty) || qty <= 0) return
    if (onReorderAction) await onReorderAction(productId, 'modified', qty)
    setProcessed(p => ({ ...p, [productId]: 'ordered' }))
    setEditingId(null)
  }

  return (
    <div className="space-y-4">

      {/* ── What needs your attention right now ── */}
      <div className="panel overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            What needs your attention right now
          </h3>
          {actionItems.length > 0 && (
            <span className="text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 px-2.5 py-1 rounded-full">
              {actionItems.length} item{actionItems.length !== 1 ? 's' : ''} to order
            </span>
          )}
        </div>

        {actionItems.length === 0 ? (
          <div className="px-5 py-8 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">You're all stocked up</p>
              <p className="text-xs text-gray-500 mt-0.5">No urgent orders needed today. {healthyCount} products are running smoothly.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {actionItems.map(item => {
              const prod = products[item.product_id]
              const color = urgencyColor(item)
              const { label: runOutLabel, deliveryLabel } = stockoutTime(item.days_until_stockout, prod?.lead_time_days ?? 3)
              const orderQty = Math.round(item.total_predicted_units * 1.2)
              const lost = lostRevenue(item, prod)
              const isEditing = editingId === item.product_id

              const borderColor = color === 'red' ? 'border-l-red-500' : color === 'orange' ? 'border-l-orange-500' : 'border-l-amber-400'
              const iconBg = color === 'red' ? 'bg-red-100 dark:bg-red-500/15' : color === 'orange' ? 'bg-orange-100 dark:bg-orange-500/15' : 'bg-amber-100 dark:bg-amber-500/15'
              const iconColor = color === 'red' ? 'text-red-600 dark:text-red-400' : color === 'orange' ? 'text-orange-600 dark:text-orange-400' : 'text-amber-600 dark:text-amber-400'

              return (
                <div key={item.product_id} className={`px-5 py-4 border-l-4 ${borderColor}`}>
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                      <AlertTriangle className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Main message — plain English */}
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {item.product_name} will run out {runOutLabel}
                      </p>

                      {/* Three key facts */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <DollarSign className="w-3.5 h-3.5 text-red-500" />
                          Lost revenue if ignored: <strong className="text-red-600 dark:text-red-400 ml-1">{formatINR(lost)}</strong>
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Truck className="w-3.5 h-3.5 text-blue-500" />
                          Supplier can deliver {deliveryLabel}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Package className="w-3.5 h-3.5 text-gray-400" />
                          {prod?.current_stock ?? 0} left in stock
                        </span>
                      </div>

                      {/* Action row */}
                      <div className="flex items-center gap-2 mt-3">
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              value={customQty}
                              onChange={e => setCustomQty(e.target.value)}
                              placeholder={orderQty.toString()}
                              className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-white/10 rounded bg-white dark:bg-white/5 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                            />
                            <span className="text-xs text-gray-500">units</span>
                            <button onClick={() => handleModify(item.product_id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded">
                              Confirm
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="p-1 text-gray-400 hover:text-gray-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOrder(item.product_id, orderQty)}
                              className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold rounded hover:opacity-90">
                              Order {orderQty} units
                            </button>
                            <button
                              onClick={() => { setEditingId(item.product_id); setCustomQty(orderQty.toString()) }}
                              className="px-3 py-1.5 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-white/5">
                              Change qty
                            </button>
                            <button
                              onClick={() => prod && onOpenDrawer(prod, item)}
                              className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                              Details <ChevronRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setProcessed(p => ({ ...p, [item.product_id]: 'snoozed' }))}
                              className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                              Snooze
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Products selling faster than usual ── */}
      {risingItems.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Selling faster than usual</h3>
            <p className="text-xs text-gray-500 mt-0.5">Stock up before demand peaks</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {risingItems.map(item => {
              const prod = products[item.product_id]
              const pctAbove = Math.round(item.total_predicted_units * 0.22)
              return (
                <div key={item.product_id}
                  className="px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  onClick={() => prod && onOpenDrawer(prod, item)}>
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.product_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Demand up ~{pctAbove} extra units this week
                      {item.trend_type === 'seasonal_spike' ? ' · seasonal spike' : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── All products overview ── */}
      <div className="panel overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">All products</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Urgent</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Watch</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Good</span>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {portfolio.map(item => {
            const prod = products[item.product_id]
            const color = urgencyColor(item)
            const dot = color === 'red' ? 'bg-red-500' : color === 'orange' ? 'bg-orange-500' : color === 'amber' ? 'bg-amber-400' : 'bg-emerald-500'
            const statusText =
              processed[item.product_id] === 'ordered' ? '✓ Order placed' :
              item.urgency === 'high' && (item.days_until_stockout ?? 99) <= 1 ? `Runs out today` :
              item.urgency === 'high' ? `Runs out in ${item.days_until_stockout}d` :
              item.urgency === 'medium' ? `Order within ${item.days_until_stockout ?? 7}d` :
              item.trend_type === 'upward' ? 'Demand rising' :
              'Well stocked'

            return (
              <div key={item.product_id}
                className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                onClick={() => prod && onOpenDrawer(prod, item)}>
                <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">{item.product_name}</span>
                <span className="text-xs text-gray-500 shrink-0">{statusText}</span>
                <span className="text-xs font-mono text-gray-400 shrink-0 hidden sm:block">{prod?.current_stock ?? '—'} in stock</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Today's summary strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Need ordering now', value: actionItems.length.toString(), color: actionItems.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Running low (watch)', value: portfolio.filter(i => i.urgency === 'medium').length.toString(), color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Well stocked', value: healthyCount.toString(), color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Forecast accuracy', value: `${data.accuracy.accuracy_pct ?? 91}%`, color: 'text-indigo-600 dark:text-indigo-400' },
        ].map(s => (
          <div key={s.label} className="panel p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Recent forecast activity ── */}
      {data.recent_predictions.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent forecast activity</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {data.recent_predictions.slice(0, 4).map(p => (
              <div key={p.request_id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-800 dark:text-gray-200">{p.product_name ?? p.product_id}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.reorder_required ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'}`}>
                    {p.reorder_required ? 'Order needed' : 'Stocked'}
                  </span>
                  <span className="text-xs text-gray-400 font-mono hidden sm:block">{Math.round(p.total_predicted_units)} units forecast</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
