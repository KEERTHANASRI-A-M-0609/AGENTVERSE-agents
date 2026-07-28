import { useState, useEffect } from 'react'
import { X, ArrowUpRight, TrendingUp, AlertCircle, ShoppingBag, Truck, Calendar, Check } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { ProductResponse, BulkForecastItem } from '@/types'
import { formatINR } from '@/lib/utils'

interface ProductDrawerProps {
  isOpen: boolean
  onClose: () => void
  product: ProductResponse | null
  forecast: BulkForecastItem | null
  dailyPredictions?: { date: string; predicted_units: number }[]
  requestId?: string | null
  onReorderAction?: (action: 'accepted' | 'modified', quantity?: number) => Promise<void>
}

export function ProductDrawer({ 
  isOpen, 
  onClose, 
  product, 
  forecast, 
  dailyPredictions,
  requestId,
  onReorderAction
}: ProductDrawerProps) {
  if (!isOpen || !product) return null

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [customQty, setCustomQty] = useState<string>('')
  const [isModifying, setIsModifying] = useState(false)

  // Reset states when product changes
  useEffect(() => {
    setSuccess(false)
    setLoading(false)
    setIsModifying(false)
    if (forecast) {
      setCustomQty(Math.round(forecast.total_predicted_units * 1.2).toString())
    }
  }, [product, forecast])

  const handleAction = async (action: 'accepted' | 'modified') => {
    if (!onReorderAction) return
    setLoading(true)
    try {
      const qty = action === 'modified' ? parseInt(customQty, 10) : undefined
      await onReorderAction(action, qty)
      setSuccess(true)
    } catch (err) {
      console.error(err)
      alert('Failed to execute restock action.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate pricing & margin
  const sellingPrice = product.selling_price ?? 120
  const costPrice = Math.round(sellingPrice * 0.65) // Mock cost at 65% of price
  const marginAmt = sellingPrice - costPrice
  const marginPct = Math.round((marginAmt / sellingPrice) * 100)

  // Mock supplier info
  const getSupplier = (cat: string) => {
    const c = cat.toLowerCase()
    if (c.includes('dairy') || c.includes('milk') || c.includes('food')) {
      return { name: 'Milco Farms Ltd', contact: 'orders@milcofarms.com', lead: '2 days' }
    }
    if (c.includes('stationery') || c.includes('notebook') || c.includes('paper')) {
      return { name: 'Zenith Paper Corp', contact: 'sales@zenithpaper.com', lead: '5 days' }
    }
    return { name: 'Apex Distributors', contact: 'replenish@apexdist.com', lead: '3 days' }
  }
  const supplier = getSupplier(product.category)

  // Status colors matching specs
  const getUrgencyBadge = (urg: string) => {
    switch (urg) {
      case 'high':
        return <span className="badge-critical">Order now</span>
      case 'medium':
        return <span className="badge-attention">Order soon</span>
      default:
        return <span className="badge-healthy">Well stocked</span>
    }
  }

  // Pre-populate timeline
  const timelineEvents = [
    { label: 'Forecast generated', desc: 'AI confidence score at 92%', date: 'Today, 08:30 AM' },
    { label: 'Stock check', desc: `Current stock: ${product.current_stock} units`, date: 'Yesterday' },
    { label: 'Supplier contact', desc: 'Last reorder of 100 units completed', date: '12 days ago' }
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white dark:bg-[#161b22] border-l border-gray-200 dark:border-white/10 flex flex-col shadow-2xl transition-transform duration-300 transform translate-x-0">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-black/10">
            <div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Product Details</span>
              <h2 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{product.name}</h2>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">{product.category} · {product.id}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-gray-150 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="panel p-3">
                <span className="label-caps block">Stock left</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-gray-900 dark:text-white">{product.current_stock}</span>
                  <span className="text-xs text-gray-500 font-sans">units</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${product.current_stock < product.reorder_point ? 'bg-red-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${Math.min(100, (product.current_stock / (product.reorder_point || 1)) * 50)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">Order more when below {product.reorder_point}</span>
              </div>

              <div className="panel p-3">
                <span className="label-caps block">Status</span>
                <div className="mt-1.5">
                  {getUrgencyBadge(forecast?.urgency ?? 'low')}
                </div>
                <p className="text-[10px] text-gray-500 mt-2">
                  {forecast?.days_until_stockout != null 
                    ? `Runs out in ~${forecast.days_until_stockout} day${forecast.days_until_stockout !== 1 ? 's' : ''}` 
                    : 'Enough stock for now'}
                </p>
              </div>
            </div>

            {/* Financial Performance */}
            <div className="panel p-4">
              <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-white/5 pb-2 mb-3">Pricing</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-gray-500 block">Selling Price</span>
                  <span className="text-sm font-bold font-mono text-gray-900 dark:text-white">{formatINR(sellingPrice)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Cost Price</span>
                  <span className="text-sm font-bold font-mono text-gray-900 dark:text-white">{formatINR(costPrice)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Gross Margin</span>
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {marginPct}%
                  </span>
                </div>
              </div>
            </div>

            {/* Demand Projection Micro-Chart */}
            {dailyPredictions && dailyPredictions.length > 0 && (
              <div className="panel p-4">
                <div className="flex items-center justify-between mb-2">
                <span className="label-caps block">Demand forecast</span>
                  <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 font-semibold font-mono">
                    <TrendingUp className="w-3 h-3" />
                    +{Math.round(forecast?.total_predicted_units ?? 0)} units
                  </span>
                </div>
                <div className="h-32 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyPredictions} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#8b93a1" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#8b93a1" />
                      <Tooltip 
                        contentStyle={{ background: '#161b22', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Area type="monotone" dataKey="predicted_units" stroke="#2563eb" fillOpacity={0.1} fill="#2563eb" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* AI Actionable Recommendation */}
            <div className="panel p-4 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40">
              <div className="flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300">What the AI recommends</h4>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mt-1">
                    {forecast?.ai_explanation || 
                     `Demand for ${product.name} is stable. Stock covers predicted demand, but recommend placing order ${product.lead_time_days} days in advance due to supplier lead times.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Supplier Information */}
            <div className="panel p-4">
              <div className="flex gap-2 items-start">
                <Truck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">Recommended Supplier</h4>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="text-[10px] text-gray-500 block">Vendor</span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{supplier.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Lead Time</span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{supplier.lead}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-2">Contact Details</span>
                  <span className="text-xs text-blue-600 font-mono select-all block mt-0.5">{supplier.contact}</span>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="panel p-4">
              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                History
              </h4>
              <div className="space-y-3">
                {timelineEvents.map((ev, i) => (
                  <div key={i} className="flex gap-3 text-xs leading-relaxed">
                    <div className="relative flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" />
                      {i < timelineEvents.length - 1 && <div className="w-0.5 bg-gray-200 dark:bg-white/5 flex-1 mt-1" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{ev.label}</p>
                      <p className="text-[10px] text-gray-500">{ev.desc}</p>
                      <span className="text-[9px] text-gray-400 font-mono">{ev.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/10 flex flex-col gap-3">
            {success ? (
              <div className="flex items-center justify-center gap-2 py-2.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-250 dark:border-emerald-500/20 rounded-lg text-xs font-bold uppercase tracking-wider">
                <Check className="w-4 h-4" />
                Restock Approved
              </div>
            ) : isModifying ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-white dark:bg-[#161b22] px-3 py-1.5 rounded border border-gray-300 dark:border-white/10">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Qty:</span>
                  <input
                    type="number"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-transparent outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={() => handleAction('modified')}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs font-bold"
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
                <button
                  onClick={() => setIsModifying(false)}
                  disabled={loading}
                  className="px-3 py-2 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => handleAction('accepted')}
                  disabled={loading}
                  className="flex-1 py-2 text-xs font-bold rounded bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 uppercase tracking-wider"
                >
                  {loading ? 'Approving...' : 'Approve Restock'}
                </button>
                <button 
                  onClick={() => setIsModifying(true)}
                  disabled={loading}
                  className="px-3 py-2 text-xs font-semibold rounded border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-150 dark:hover:bg-white/5"
                >
                  Modify Qty
                </button>
                <button 
                  onClick={() => {
                    alert(`Supplier Contact Details:\nName: ${supplier.name}\nEmail: ${supplier.contact}\nRecommended restock quantity: ${customQty} units.`);
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-150 dark:hover:bg-white/5"
                >
                  Contact Vendor
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
