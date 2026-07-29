import { useState, useEffect } from 'react'
import { useAnalyticsDashboard } from '@/hooks/useAnalyticsDashboard'
import { useEventStream } from '@/hooks/useEventStream'
import { AgentShell, MONTH_FILTERS, type MonthFilter } from '@/components/agent/AgentShell'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { AnalyticsWorkspaceBody } from '@/components/agent/AnalyticsWorkspaceBody'
import { ProductDrawer } from '@/components/agent/ProductDrawer'
import { LiveEventFeed } from '@/components/agent/LiveEventFeed'
import { AgentChatbot } from '@/components/agent/AgentChatbot'
import {
  LiveKPIStrip, RevenueAreaChart, OrdersBarChart, CategoryPieChart,
} from '@/components/agent/LiveCharts'
import { productsApi } from '@/api/products'
import type { ProductResponse, BulkForecastItem } from '@/types'
import { BarChart3, TrendingUp, TrendingDown, Activity, ShieldCheck } from 'lucide-react'
import { formatINR } from '@/lib/utils'

const SHOP_ID = 'shop_001'

export default function BusinessAnalytics() {
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('this_month')
  const days = MONTH_FILTERS.find(f => f.value === monthFilter)?.days ?? 30
  const { data, loading, error, refetch } = useAnalyticsDashboard(SHOP_ID, days)
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
  }

  const handleExport = () => {
    if (!data) return
    const { dashboard, health, insights, products: prods, trends } = data
    const lines = [
      'ShopMind BI Report',
      `Shop,${SHOP_ID}`, `Period,${days} days`, `As of,${dashboard.as_of}`,
      `Health Score,${Math.round(health.health_score)}`,
      `Period Revenue,${formatINR(trends.total_revenue)}`,
      `Growth %,${dashboard.kpis.revenue_growth_pct.toFixed(1)}`,
      '', 'Recommendations', ...insights.recommendations,
      '', 'Best Sellers', ...prods.best_selling.map(p => `${p.product_name},${p.units_sold},${p.revenue}`),
      '', 'Slow Movers', ...prods.slow_moving.map(p => `${p.product_name},${p.units_sold},${p.revenue}`),
    ]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    a.download = `bi_report_${SHOP_ID}_${days}d.csv`; a.click()
  }

  const h = Math.round(data?.health.health_score ?? 0)
  const g = data?.dashboard.kpis.revenue_growth_pct ?? 0
  const revenue = data?.trends.total_revenue ?? 0
  const orders = data?.dashboard.kpis.total_orders ?? 0

  return (
    <AgentShell
      agent="analytics"
      shopName={data?.dashboard.shop_name ?? SHOP_ID}
      onRefresh={refetch} refreshing={loading} onExport={handleExport}
      monthFilter={monthFilter} onMonthFilterChange={setMonthFilter}
    >
      {loading && !data && <div className="p-6"><LoadingSkeleton rows={6} /></div>}
      {error && <div className="p-6"><ErrorState message={error} onRetry={refetch} /></div>}

      {data && (
        <div className="p-5 space-y-4">

          {/* ── Page header ── */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', boxShadow: '0 0 16px rgba(139,92,246,0.25)' }}>
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold" style={{ letterSpacing: '-0.01em' }}>Business Intelligence</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider"
                    style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
                  {(data.products.best_selling.length + data.products.slow_moving.length)} products · {MONTH_FILTERS.find(f => f.value === monthFilter)?.label}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { icon: <Activity className="w-3 h-3" />, label: 'Health', value: `${h}/100`, tone: h >= 70 ? '#10b981' : h >= 50 ? '#f59e0b' : '#ef4444' },
                { icon: g >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />, label: 'Revenue', value: formatINR(revenue), tone: g >= 0 ? '#10b981' : '#ef4444' },
                { icon: <ShieldCheck className="w-3 h-3" />, label: 'Orders', value: orders.toString(), tone: '#818cf8' },
              ].map(chip => (
                <div key={chip.label} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                  style={{ background: `${chip.tone}08`, border: `1px solid ${chip.tone}18` }}>
                  <span style={{ color: chip.tone }}>{chip.icon}</span>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider leading-none" style={{ color: chip.tone, opacity: 0.7 }}>{chip.label}</p>
                    <p className="text-[11px] font-bold font-mono leading-none mt-0.5" style={{ color: chip.tone }}>{chip.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Live KPI strip from SSE ── */}
          <LiveKPIStrip events={events} />

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Revenue area chart */}
            <div className="card p-4 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-semibold">Revenue Trend</p>
                  <p className="text-[9px] mt-0.5" style={{ color: 'rgba(148,163,184,0.4)' }}>
                    {days}-day window · {formatINR(data.trends.total_revenue)} total
                  </p>
                </div>
                <span className={`text-[13px] font-bold font-mono ${g >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {g >= 0 ? '+' : ''}{g.toFixed(1)}%
                </span>
              </div>
              <RevenueAreaChart series={data.trends.series} color="#8b5cf6" height={150} />
            </div>

            {/* Category pie */}
            <div className="card p-4">
              <p className="text-[11px] font-semibold mb-1">Revenue by Category</p>
              <p className="text-[9px] mb-2" style={{ color: 'rgba(148,163,184,0.4)' }}>Top sellers breakdown</p>
              <CategoryPieChart data={data} height={170} />
            </div>
          </div>

          {/* Orders + units bar chart */}
          <div className="card p-4">
            <p className="text-[11px] font-semibold mb-1">Orders & Units Sold</p>
            <p className="text-[9px] mb-3" style={{ color: 'rgba(148,163,184,0.4)' }}>
              Daily breakdown · <span style={{ color: '#6366f1' }}>■</span> Orders &nbsp;
              <span style={{ color: '#8b5cf6' }}>■</span> Units
            </p>
            <OrdersBarChart series={data.trends.series} height={130} />
          </div>

          {/* ── Main content: workspace + live feed ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <AnalyticsWorkspaceBody
                data={data} products={products}
                onOpenDrawer={openDrawer} days={days}
              />
            </div>
            <div style={{ height: 640 }}>
              <LiveEventFeed
                events={events} connected={connected} reconnecting={reconnecting}
                totalReceived={totalReceived} shopId={SHOP_ID} onClear={clearEvents}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating chatbot */}
      <AgentChatbot mode="analytics" shopId={SHOP_ID} analytics={data} horizon={days} />

      <ProductDrawer
        isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}
        product={selectedProduct} forecast={selectedForecast}
        onReorderAction={async () => {}}
      />
    </AgentShell>
  )
}
