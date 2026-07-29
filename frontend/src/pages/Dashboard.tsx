import { useState, useMemo, useEffect } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { useDemandForecast } from '@/hooks/useDemandForecast'
import { useEventStream } from '@/hooks/useEventStream'
import { AgentShell } from '@/components/agent/AgentShell'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { productsApi } from '@/api/products'
import { demandApi } from '@/api/demand'
import { ProductDrawer } from '@/components/agent/ProductDrawer'
import { DemandWorkspaceBody } from '@/components/agent/DemandWorkspaceBody'
import { LiveEventFeed } from '@/components/agent/LiveEventFeed'
import { AgentChatbot } from '@/components/agent/AgentChatbot'
import {
  LiveKPIStrip, LiveRevenueTicker, UrgencyRadialChart, ForecastConfidenceChart,
} from '@/components/agent/LiveCharts'
import type { ProductResponse, BulkForecastItem } from '@/types'
import { AlertTriangle, ShieldCheck, Activity, Target, TrendingUp, TrendingDown } from 'lucide-react'
import { ReminderPanel } from '@/components/agent/ReminderPanel'
import { motion, AnimatePresence } from 'framer-motion'

const SHOP_ID = 'shop_001'
const HORIZON = 7

export default function Dashboard() {
  const horizon = HORIZON
  const { data, loading, error, refetch } = useDashboard(SHOP_ID, horizon)
  const { data: prediction, predict } = useDemandForecast()
  const { events, connected, reconnecting, totalReceived, clearEvents } = useEventStream()

  const [products, setProducts] = useState<Record<string, ProductResponse>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null)
  const [selectedForecast, setSelectedForecast] = useState<BulkForecastItem | null>(null)

  useEffect(() => {
    productsApi.list(SHOP_ID).then(r =>
      setProducts(r.products.reduce((a, p) => ({ ...a, [p.id]: p }), {} as Record<string, ProductResponse>))
    ).catch(() => {})
  }, [])

  const openDrawer = (prod: ProductResponse, item: BulkForecastItem) => {
    setSelectedProduct(prod); setSelectedForecast(item); setDrawerOpen(true)
    void predict(SHOP_ID, item.product_id, HORIZON)
  }

  const getReqId = (productId: string) =>
    data?.recent_predictions.find(p => p.product_id === productId)?.request_id

  const handleExport = () => {
    if (!data) return
    const portfolio = data.portfolio?.length ? data.portfolio : data.top_reorder_products
    const rows = portfolio.map(f =>
      [f.product_id, `"${f.product_name}"`, Math.round(f.total_predicted_units), f.confidence_score.toFixed(2), f.trend_type, f.urgency, f.days_until_stockout ?? ''].join(',')
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([['sku,product,predicted_units,confidence,trend,urgency,days_until_stockout', ...rows].join('\n')], { type: 'text/csv' }))
    a.download = `demand_${SHOP_ID}_${horizon}d.csv`; a.click()
  }

  const riskSummary = useMemo(() => {
    if (!data) return null
    const portfolio = data.portfolio?.length ? data.portfolio : data.top_reorder_products
    const critical = portfolio.filter(i => i.urgency === 'high' && (i.days_until_stockout ?? 99) <= 3).length
    const high = portfolio.filter(i => i.urgency === 'high').length
    const medium = portfolio.filter(i => i.urgency === 'medium').length
    const rising = portfolio.filter(i => i.trend_type === 'upward' || i.trend_type === 'seasonal_spike').length
    const conf = Math.round((data.kpis.avg_confidence_score ?? 0) * 100)
    const health = Math.round(data.kpis.inventory_health_score ?? 0)
    return { critical, high, medium, rising, conf, health, total: portfolio.length }
  }, [data])

  const statusTone = riskSummary?.critical ? 'critical' : riskSummary?.high ? 'high' : riskSummary?.medium ? 'medium' : 'good'
  const tc = {
    critical: { bg: 'var(--red-lt)',   border: 'var(--red-bd)',   text: 'var(--red)'   },
    high:     { bg: '#fff7ed',         border: '#fed7aa',         text: '#c2410c'      },
    medium:   { bg: 'var(--amber-lt)', border: 'var(--amber-bd)', text: 'var(--amber)' },
    good:     { bg: 'var(--green-lt)', border: 'var(--green-bd)', text: 'var(--green)' },
  }[statusTone]

  const statusText = riskSummary
    ? riskSummary.critical > 0 ? `${riskSummary.critical} SKU${riskSummary.critical !== 1 ? 's' : ''} running out today — order now`
    : riskSummary.high > 0 ? `${riskSummary.high} SKU${riskSummary.high !== 1 ? 's' : ''} need ordering this week`
    : riskSummary.medium > 0 ? `${riskSummary.medium} SKU${riskSummary.medium !== 1 ? 's' : ''} to watch`
    : `All ${riskSummary.total} products well stocked`
    : 'Loading…'

  return (
    <AgentShell
      agent="demand"
      shopName={data?.shop_name ?? SHOP_ID}
      onRefresh={refetch} refreshing={loading} onExport={handleExport}
    >
      {loading && !data && <div className="p-6"><LoadingSkeleton rows={6} /></div>}
      {error && <div className="p-6"><ErrorState message={error} onRetry={refetch} /></div>}

      {data && riskSummary && (
        <div className="p-5 space-y-4">

          {/* ── Status banner ── */}
          <AnimatePresence mode="wait">
            <motion.div key={statusTone}
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl p-4 flex items-center gap-4 flex-wrap"
              style={{ background: tc.bg, border: `1px solid ${tc.border}` }}>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${tc.text}18`, border: `1px solid ${tc.border}` }}>
                {statusTone === 'good'
                  ? <ShieldCheck className="w-4.5 h-4.5" style={{ color: tc.text }} />
                  : <AlertTriangle className="w-4.5 h-4.5" style={{ color: tc.text }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold" style={{ color: tc.text }}>Demand Agent · 30-day forecast</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider"
                    style={{ background: `${tc.text}18`, color: tc.text, border: `1px solid ${tc.border}` }}>
                    {statusTone === 'good' ? 'HEALTHY' : statusTone === 'medium' ? 'WATCH' : 'ACTION NEEDED'}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(203,213,225,0.65)' }}>{statusText}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { icon: <Activity className="w-3 h-3" />, label: 'Health', value: `${riskSummary.health}/100`, color: riskSummary.health >= 70 ? 'var(--green)' : riskSummary.health >= 50 ? 'var(--amber)' : 'var(--red)' },
                  { icon: <Target className="w-3 h-3" />, label: 'Confidence', value: `${riskSummary.conf}%`, color: riskSummary.conf >= 75 ? 'var(--green)' : 'var(--amber)' },
                  { icon: riskSummary.rising > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />, label: 'Rising', value: `${riskSummary.rising}`, color: 'var(--amber)' },
                ].map(chip => (
                  <div key={chip.label} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                    style={{ background: `${chip.color}10`, border: `1px solid ${chip.color}20` }}>
                    <span style={{ color: chip.color }}>{chip.icon}</span>
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider leading-none" style={{ color: chip.color, opacity: 0.7 }}>{chip.label}</p>
                      <p className="text-[10px] font-bold font-mono leading-none mt-0.5" style={{ color: chip.color }}>{chip.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ── Live KPI strip from SSE ── */}
          <LiveKPIStrip events={events} />

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Live revenue ticker */}
            <div className="card p-4">
              <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--text-1)' }}>Live Sales Stream</p>
              <p className="text-[9px] mb-3" style={{ color: 'var(--text-3)' }}>Real-time revenue from SSE events</p>
              <LiveRevenueTicker events={events} height={110} />
            </div>

            {/* Urgency radial */}
            <div className="card p-4">
              <p className="text-[11px] font-semibold mb-3" style={{ color: 'var(--text-1)' }}>Inventory Urgency</p>
              <UrgencyRadialChart data={data} />
            </div>

            {/* Forecast confidence */}
            <div className="card p-4">
              <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--text-1)' }}>Forecast Confidence by SKU</p>
              <p className="text-[9px] mb-2" style={{ color: 'var(--text-3)' }}>Top 12 products</p>
              <ForecastConfidenceChart data={data} height={130} />
            </div>
          </div>

          {/* ── Main content: workspace + right column ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <DemandWorkspaceBody
                data={data} products={products}
                onSelect={() => {}} onOpenDrawer={openDrawer}
                onReorderAction={async (productId, action, qty) => {
                  const reqId = getReqId(productId)
                  if (reqId) await demandApi.recommendationAction(reqId, action, qty)
                }}
              />
            </div>
            <div className="space-y-4">
              <ReminderPanel
                products={(data.portfolio?.length ? data.portfolio : data.top_reorder_products)
                  .map(p => ({ id: p.product_id, name: p.product_name }))}
              />
              <div style={{ height: 400 }}>
                <LiveEventFeed
                  events={events} connected={connected} reconnecting={reconnecting}
                  totalReceived={totalReceived} shopId={SHOP_ID} onClear={clearEvents}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating chatbot */}
      <AgentChatbot mode="demand" shopId={SHOP_ID} demand={data} horizon={horizon} />

      <ProductDrawer
        isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}
        product={selectedProduct} forecast={selectedForecast}
        dailyPredictions={prediction?.forecast?.daily_predictions}
        requestId={prediction?.request_id}
        onReorderAction={async (action, qty) => {
          if (selectedProduct) {
            const reqId = getReqId(selectedProduct.id)
            if (reqId) await demandApi.recommendationAction(reqId, action, qty)
          }
        }}
      />
    </AgentShell>
  )
}
